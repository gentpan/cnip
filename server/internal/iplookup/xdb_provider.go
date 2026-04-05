package iplookup

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/lionsoul2014/ip2region/binding/golang/xdb"
)

type database struct {
	path     string
	searcher *xdb.Searcher
}

type provider struct {
	mu sync.RWMutex
	v4 *database
	v6 *database
}

func newProvider(v4Path, v6Path string) (*provider, error) {
	p := &provider{}

	if v4Path != "" {
		db, err := openDatabase(v4Path)
		if err != nil {
			return nil, fmt.Errorf("open ipv4 database: %w", err)
		}
		p.v4 = db
	}

	if v6Path != "" {
		db, err := openDatabase(v6Path)
		if err != nil {
			if p.v4 != nil {
				p.v4.searcher.Close()
			}
			return nil, fmt.Errorf("open ipv6 database: %w", err)
		}
		p.v6 = db
	}

	return p, nil
}

func openDatabase(path string) (*database, error) {
	if _, err := os.Stat(path); err != nil {
		return nil, err
	}

	header, err := xdb.LoadHeaderFromFile(path)
	if err != nil {
		return nil, err
	}

	version, err := xdb.VersionFromHeader(header)
	if err != nil {
		return nil, err
	}

	searcher, err := xdb.NewWithFileOnly(version, path)
	if err != nil {
		return nil, err
	}

	return &database{path: path, searcher: searcher}, nil
}

func (p *provider) search(ip net.IP) (string, string, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	if ip == nil {
		return "", "", fmt.Errorf("invalid ip")
	}

	if ip4 := ip.To4(); ip4 != nil {
		if p.v4 == nil {
			return "", "", fmt.Errorf("ipv4 database not configured")
		}

		region, err := p.v4.searcher.SearchByStr(ip4.String())
		return "ipv4", region, err
	}

	if p.v6 == nil {
		return "", "", fmt.Errorf("ipv6 database not configured")
	}

	region, err := p.v6.searcher.SearchByStr(ip.String())
	return "ipv6", region, err
}

func (p *provider) reload(v4Path, v6Path string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if v4Path != "" {
		newDB, err := openDatabase(v4Path)
		if err != nil {
			return err
		}
		old := p.v4
		p.v4 = newDB
		if old != nil {
			old.searcher.Close()
		}
	}

	if v6Path != "" {
		newDB, err := openDatabase(v6Path)
		if err != nil {
			return err
		}
		old := p.v6
		p.v6 = newDB
		if old != nil {
			old.searcher.Close()
		}
	}

	return nil
}

func (p *provider) close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.v4 != nil {
		p.v4.searcher.Close()
	}
	if p.v6 != nil {
		p.v6.searcher.Close()
	}
	return nil
}

type dbHeader struct {
	Family      string
	Path        string
	Version     uint16
	CreatedAt   int64
	CreatedDate string
}

func (p *provider) headers() []dbHeader {
	p.mu.RLock()
	defer p.mu.RUnlock()

	var headers []dbHeader
	if p.v4 != nil {
		headers = append(headers, loadHeader("ipv4", p.v4.path))
	}
	if p.v6 != nil {
		headers = append(headers, loadHeader("ipv6", p.v6.path))
	}
	return headers
}

func loadHeader(family string, path string) dbHeader {
	header, err := xdb.LoadHeaderFromFile(path)
	if err != nil {
		return dbHeader{
			Family:      family,
			Path:        filepath.Clean(path),
			CreatedDate: "unavailable",
		}
	}

	return dbHeader{
		Family:      family,
		Path:        filepath.Clean(path),
		Version:     header.Version,
		CreatedAt:   int64(header.CreatedAt),
		CreatedDate: time.Unix(int64(header.CreatedAt), 0).Format(time.RFC3339),
	}
}
