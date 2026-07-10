package metrics

import (
	"path/filepath"
	"testing"
	"time"
)

func TestSnapshotWindows(t *testing.T) {
	store, err := New(filepath.Join(t.TempDir(), "metrics.json"), time.Hour)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	now := time.Date(2026, 7, 11, 12, 30, 0, 0, time.UTC)
	store.nowFunc = func() time.Time { return now.Add(-31 * 24 * time.Hour) }
	store.Increment()
	store.nowFunc = func() time.Time { return now.Add(-8 * 24 * time.Hour) }
	store.Increment()
	store.nowFunc = func() time.Time { return now.Add(-2 * 24 * time.Hour) }
	store.Increment()
	store.nowFunc = func() time.Time { return now.Add(-2 * time.Hour) }
	store.Increment()
	store.nowFunc = func() time.Time { return now }

	snapshot := store.Snapshot()
	if snapshot.Last24H != 1 {
		t.Fatalf("last_24h = %d, want 1", snapshot.Last24H)
	}
	if snapshot.Last7D != 2 {
		t.Fatalf("last_7d = %d, want 2", snapshot.Last7D)
	}
	if snapshot.Last30D != 3 {
		t.Fatalf("last_30d = %d, want 3", snapshot.Last30D)
	}
	if snapshot.All != 4 {
		t.Fatalf("all = %d, want 4", snapshot.All)
	}
}

func TestFlushAndReload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "metrics.json")
	store, err := New(path, time.Hour)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	now := time.Date(2026, 7, 11, 12, 30, 0, 0, time.UTC)
	store.nowFunc = func() time.Time { return now }
	store.Increment()
	store.Increment()
	if err := store.Flush(); err != nil {
		t.Fatalf("flush: %v", err)
	}

	reloaded, err := New(path, time.Hour)
	if err != nil {
		t.Fatalf("reload store: %v", err)
	}
	reloaded.nowFunc = func() time.Time { return now }

	snapshot := reloaded.Snapshot()
	if snapshot.All != 2 || snapshot.Last24H != 2 {
		t.Fatalf("snapshot = %+v, want all and last_24h to be 2", snapshot)
	}
}
