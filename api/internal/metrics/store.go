package metrics

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

const (
	hour         = int64(time.Hour / time.Second)
	retentionAge = 30 * 24 * time.Hour
)

type Store struct {
	path          string
	flushInterval time.Duration

	mu      sync.Mutex
	total   uint64
	hourly  map[int64]uint64
	dirty   bool
	closed  bool
	nowFunc func() time.Time
}

type Snapshot struct {
	GeneratedAt string `json:"generated_at"`
	Last24H     uint64 `json:"last_24h"`
	Last7D      uint64 `json:"last_7d"`
	Last30D     uint64 `json:"last_30d"`
	All         uint64 `json:"all"`
	Series      Series `json:"series"`
}

type Series struct {
	Last24H []Bucket `json:"last_24h"`
	Last7D  []Bucket `json:"last_7d"`
	Last30D []Bucket `json:"last_30d"`
	All     []Bucket `json:"all"`
}

type Bucket struct {
	Start string `json:"start"`
	Label string `json:"label"`
	Count uint64 `json:"count"`
}

type filePayload struct {
	Total  uint64            `json:"total"`
	Hourly map[string]uint64 `json:"hourly"`
}

func New(path string, flushInterval time.Duration) (*Store, error) {
	if flushInterval <= 0 {
		flushInterval = 15 * time.Second
	}

	s := &Store{
		path:          path,
		flushInterval: flushInterval,
		hourly:        make(map[int64]uint64),
		nowFunc:       time.Now,
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) Increment() {
	now := s.nowFunc().UTC()
	bucket := now.Unix() / hour * hour

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return
	}

	s.total++
	s.hourly[bucket]++
	s.pruneLocked(now)
	s.dirty = true
}

func (s *Store) Snapshot() Snapshot {
	now := s.nowFunc().UTC()
	cut24h := now.Add(-24 * time.Hour)
	cut7d := now.Add(-7 * 24 * time.Hour)
	cut30d := now.Add(-30 * 24 * time.Hour)

	s.mu.Lock()
	defer s.mu.Unlock()

	s.pruneLocked(now)

	last24h := s.sumSinceLocked(cut24h)
	last7d := s.sumSinceLocked(cut7d)
	last30d := s.sumSinceLocked(cut30d)

	return Snapshot{
		GeneratedAt: now.Format(time.RFC3339),
		Last24H:     last24h,
		Last7D:      last7d,
		Last30D:     last30d,
		All:         s.total,
		Series: Series{
			Last24H: s.hourlySeriesLocked(now, 24),
			Last7D:  s.dailySeriesLocked(now, 7, 0),
			Last30D: s.dailySeriesLocked(now, 30, 0),
			All:     s.dailySeriesLocked(now, 30, s.total-last30d),
		},
	}
}

func (s *Store) Run(ctx context.Context) {
	ticker := time.NewTicker(s.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			_ = s.Flush()
			return
		case <-ticker.C:
			_ = s.Flush()
		}
	}
}

func (s *Store) Close() error {
	s.mu.Lock()
	s.closed = true
	s.mu.Unlock()
	return s.Flush()
}

func (s *Store) Flush() error {
	s.mu.Lock()
	if !s.dirty {
		s.mu.Unlock()
		return nil
	}
	payload := s.filePayloadLocked()
	s.dirty = false
	s.mu.Unlock()

	return writePayload(s.path, payload)
}

func (s *Store) load() error {
	body, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	var payload filePayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return err
	}

	s.total = payload.Total
	for key, value := range payload.Hourly {
		bucket, err := strconv.ParseInt(key, 10, 64)
		if err != nil {
			continue
		}
		s.hourly[bucket] = value
	}
	s.pruneLocked(s.nowFunc().UTC())
	return nil
}

func (s *Store) pruneLocked(now time.Time) {
	cutoff := now.Add(-retentionAge).Unix() / hour * hour
	for bucket := range s.hourly {
		if bucket < cutoff {
			delete(s.hourly, bucket)
		}
	}
}

func (s *Store) sumSinceLocked(cutoff time.Time) uint64 {
	cutoffBucket := cutoff.UTC().Unix() / hour * hour
	var total uint64
	for bucket, count := range s.hourly {
		if bucket >= cutoffBucket {
			total += count
		}
	}
	return total
}

func (s *Store) hourlySeriesLocked(now time.Time, buckets int) []Bucket {
	end := now.UTC().Truncate(time.Hour)
	start := end.Add(-time.Duration(buckets-1) * time.Hour)
	series := make([]Bucket, 0, buckets)
	for ts := start; !ts.After(end); ts = ts.Add(time.Hour) {
		series = append(series, Bucket{
			Start: ts.Format(time.RFC3339),
			Label: ts.Format("15:04"),
			Count: s.hourly[ts.Unix()],
		})
	}
	return series
}

func (s *Store) dailySeriesLocked(now time.Time, days int, older uint64) []Bucket {
	end := time.Date(now.UTC().Year(), now.UTC().Month(), now.UTC().Day(), 0, 0, 0, 0, time.UTC)
	start := end.AddDate(0, 0, -(days - 1))
	series := make([]Bucket, 0, days+1)
	if older > 0 {
		series = append(series, Bucket{
			Start: start.AddDate(0, 0, -1).Format(time.RFC3339),
			Label: "更早",
			Count: older,
		})
	}
	for day := start; !day.After(end); day = day.AddDate(0, 0, 1) {
		next := day.AddDate(0, 0, 1)
		var total uint64
		for bucket, count := range s.hourly {
			bucketTime := time.Unix(bucket, 0).UTC()
			if !bucketTime.Before(day) && bucketTime.Before(next) {
				total += count
			}
		}
		series = append(series, Bucket{
			Start: day.Format(time.RFC3339),
			Label: day.Format("01-02"),
			Count: total,
		})
	}
	return series
}

func (s *Store) filePayloadLocked() filePayload {
	payload := filePayload{
		Total:  s.total,
		Hourly: make(map[string]uint64, len(s.hourly)),
	}
	for bucket, count := range s.hourly {
		payload.Hourly[strconv.FormatInt(bucket, 10)] = count
	}
	return payload
}

func writePayload(path string, payload filePayload) error {
	if path == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	body, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	body = append(body, '\n')

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, body, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
