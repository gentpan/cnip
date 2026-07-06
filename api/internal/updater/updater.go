package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/lionsoul2014/ip2region/binding/golang/xdb"

	"ip2region.io/api/internal/config"
	"ip2region.io/api/internal/model"
)

type Reloader interface {
	Reload() error
}

type Manager struct {
	cfg      config.Config
	reloader Reloader
	client   *http.Client
	loc      *time.Location
}

type latestVersionResponse struct {
	Errno  int    `json:"errno"`
	Errstr string `json:"errstr"`
	Data   struct {
		Source     string `json:"_source"`
		ServiceID  string `json:"srv_id"`
		Model      string `json:"model"`
		ReleasedAt int64  `json:"released_at"`
		ReleasedDT string `json:"released_dt"`
		ExpiredAt  int64  `json:"expired_at"`
		ExpiredDT  string `json:"expired_dt"`
	} `json:"data"`
}

func NewManager(cfg config.Config, reloader Reloader) *Manager {
	loc, err := time.LoadLocation(cfg.UpdateTimezone)
	if err != nil {
		loc = time.FixedZone("CST", 8*60*60)
	}

	return &Manager{
		cfg:      cfg,
		reloader: reloader,
		client: &http.Client{
			Timeout: cfg.UpdateTimeout,
		},
		loc: loc,
	}
}

func (m *Manager) Run(ctx context.Context) {
	for {
		nextRun := m.nextScheduledRun(time.Now())
		wait := time.Until(nextRun)
		if wait < 0 {
			wait = 0
		}

		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			result, err := m.CheckAndUpdate(ctx)
			if err != nil {
				log.Printf("scheduled update failed: %v", err)
				continue
			}

			log.Printf("scheduled update finished: next=%s updated=%v message=%s", nextRun.In(m.loc).Format(time.RFC3339), result.Updated, result.Message)
		}
	}
}

func (m *Manager) nextScheduledRun(now time.Time) time.Time {
	localNow := now.In(m.loc)
	candidate := scheduledBusinessRun(localNow.Year(), localNow.Month(), m.loc)
	if !candidate.After(localNow) {
		nextMonth := localNow.AddDate(0, 1, 0)
		candidate = scheduledBusinessRun(nextMonth.Year(), nextMonth.Month(), m.loc)
	}
	return candidate
}

func scheduledBusinessRun(year int, month time.Month, loc *time.Location) time.Time {
	day := time.Date(year, month, 1, 13, 0, 0, 0, loc)
	for !isBusinessDay(day) {
		day = day.AddDate(0, 0, 1)
	}
	return day
}

func isBusinessDay(t time.Time) bool {
	switch t.Weekday() {
	case time.Saturday, time.Sunday:
		return false
	default:
		return true
	}
}

func (m *Manager) CheckAndUpdate(ctx context.Context) (*model.UpdateResponse, error) {
	results := make([]model.UpdateResult, 0, 2)
	updatedAny := false

	for _, item := range []struct {
		family      string
		dbPath      string
		versionURL  string
		downloadURL string
	}{
		{family: "ipv4", dbPath: m.cfg.V4DBPath, versionURL: m.cfg.V4VersionURL, downloadURL: m.cfg.V4DownloadURL},
		{family: "ipv6", dbPath: m.cfg.V6DBPath, versionURL: m.cfg.V6VersionURL, downloadURL: m.cfg.V6DownloadURL},
	} {
		if item.dbPath == "" || item.versionURL == "" || item.downloadURL == "" {
			results = append(results, model.UpdateResult{
				Family:  item.family,
				Updated: false,
				Message: "missing update configuration",
			})
			continue
		}

		result, err := m.updateOne(ctx, item.family, item.dbPath, item.versionURL, item.downloadURL)
		if err != nil {
			results = append(results, model.UpdateResult{
				Family:  item.family,
				Updated: false,
				Message: err.Error(),
			})
			continue
		}

		if result.Updated {
			updatedAny = true
		}
		results = append(results, result)
	}

	if updatedAny {
		if err := m.reloader.Reload(); err != nil {
			return nil, fmt.Errorf("reload database: %w", err)
		}
	}

	message := "already latest"
	if updatedAny {
		message = "database updated"
	}

	return &model.UpdateResponse{
		Updated: updatedAny,
		Message: message,
		Items:   results,
	}, nil
}

func (m *Manager) updateOne(
	ctx context.Context,
	family string,
	dbPath string,
	versionURL string,
	downloadURL string,
) (model.UpdateResult, error) {
	remote, err := m.fetchLatestVersion(ctx, versionURL)
	if err != nil {
		return model.UpdateResult{}, fmt.Errorf("fetch latest version: %w", err)
	}

	localCreatedAt, err := localCreatedAt(dbPath)
	if err != nil {
		return model.UpdateResult{}, fmt.Errorf("read local xdb header: %w", err)
	}

	normalizedLocal := normalizeReleaseTime(localCreatedAt)
	if remote.Data.ReleasedAt <= normalizedLocal {
		return model.UpdateResult{
			Family:         family,
			Updated:        false,
			LocalCreatedAt: normalizedLocal,
			RemoteReleased: remote.Data.ReleasedAt,
			Message:        "already latest",
		}, nil
	}

	targetPath, err := m.downloadToTempAndReplace(ctx, downloadURL, dbPath)
	if err != nil {
		return model.UpdateResult{}, fmt.Errorf("download and replace xdb: %w", err)
	}

	return model.UpdateResult{
		Family:         family,
		Updated:        true,
		LocalCreatedAt: normalizedLocal,
		RemoteReleased: remote.Data.ReleasedAt,
		DownloadedTo:   targetPath,
		Message:        "updated successfully",
	}, nil
}

func (m *Manager) fetchLatestVersion(ctx context.Context, url string) (*latestVersionResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", m.cfg.UpdateUserAgent)

	resp, err := m.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var payload latestVersionResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Errno != 0 {
		return nil, fmt.Errorf("api error: %s", payload.Errstr)
	}

	return &payload, nil
}

func (m *Manager) downloadToTempAndReplace(ctx context.Context, downloadURL, dbPath string) (string, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return "", err
	}

	tmpPath := dbPath + ".tmp.xdb"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, downloadURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", m.cfg.UpdateUserAgent)

	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return "", fmt.Errorf("unexpected status: %s", resp.Status)
	}

	file, err := os.Create(tmpPath)
	if err != nil {
		return "", err
	}

	if _, err := io.Copy(file, resp.Body); err != nil {
		_ = file.Close()
		return "", err
	}

	if err := file.Close(); err != nil {
		return "", err
	}

	if err := os.Rename(tmpPath, dbPath); err != nil {
		return "", err
	}

	return dbPath, nil
}

func localCreatedAt(path string) (int64, error) {
	header, err := xdb.LoadHeaderFromFile(path)
	if err != nil {
		return 0, err
	}
	return int64(header.CreatedAt), nil
}

func normalizeReleaseTime(ts int64) int64 {
	t := time.Unix(ts, 0)
	return time.Date(t.Year(), t.Month(), t.Day(), 13, 0, 0, 0, t.Location()).Unix()
}
