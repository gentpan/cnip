package iplookup

import (
	"context"
	"fmt"
	"net"
	"slices"
	"strconv"
	"strings"

	"ip2region.io/server/internal/config"
	"ip2region.io/server/internal/model"
)

type Service struct {
	cfg      config.Config
	provider *provider
}

func NewService(cfg config.Config) (*Service, error) {
	provider, err := newProvider(cfg.V4DBPath, cfg.V6DBPath)
	if err != nil {
		return nil, err
	}

	return &Service{
		cfg:      cfg,
		provider: provider,
	}, nil
}

func (s *Service) Lookup(ctx context.Context, query string) (*model.LookupResponse, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}

	response := &model.LookupResponse{
		Query: query,
	}

	ips, queryType, err := s.resolveInput(ctx, query)
	if err != nil {
		return nil, err
	}

	response.QueryType = queryType
	response.ResolvedIPs = make([]string, 0, len(ips))
	response.Results = make([]model.LookupResult, 0, len(ips))

	for _, ip := range ips {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		response.ResolvedIPs = append(response.ResolvedIPs, ip.String())
		family, raw, err := s.provider.search(ip)
		if err != nil {
			return nil, err
		}

		response.Results = append(response.Results, parseRegion(ip.String(), family, raw))
	}

	return response, nil
}

func (s *Service) Reload() error {
	return s.provider.reload(s.cfg.V4DBPath, s.cfg.V6DBPath)
}

func (s *Service) Close() error {
	return s.provider.close()
}

func (s *Service) Meta() model.MetaResponse {
	headers := s.provider.headers()
	databases := make([]model.DBMeta, 0, len(headers))
	for _, header := range headers {
		databases = append(databases, model.DBMeta{
			Family:      header.Family,
			Path:        header.Path,
			CreatedAt:   header.CreatedAt,
			CreatedDate: header.CreatedDate,
		})
	}

	return model.MetaResponse{
		Service:       "ip2region lookup",
		PublicBaseURL: s.cfg.PublicBaseURL,
		UpdateEnabled: s.cfg.UpdateEnabled,
		Databases:     databases,
	}
}

func (s *Service) LatestDatabaseCreatedDate() string {
	headers := s.provider.headers()
	var latest model.DBMeta
	for _, header := range headers {
		if header.CreatedAt > latest.CreatedAt {
			latest = model.DBMeta{
				Family:      header.Family,
				Path:        header.Path,
				CreatedAt:   header.CreatedAt,
				CreatedDate: header.CreatedDate,
			}
		}
	}
	return latest.CreatedDate
}

func (s *Service) LatestDatabaseVersion() string {
	headers := s.provider.headers()
	var latestCreatedAt int64
	var latestVersion uint16
	for _, header := range headers {
		if header.CreatedAt > latestCreatedAt {
			latestCreatedAt = header.CreatedAt
			latestVersion = header.Version
		}
	}
	if latestVersion == 0 {
		return ""
	}
	return fmt.Sprintf("v%d", latestVersion)
}

func (s *Service) resolveInput(ctx context.Context, query string) ([]net.IP, string, error) {
	if ip := net.ParseIP(query); ip != nil {
		return []net.IP{ip}, classifyIP(ip), nil
	}

	records, err := net.DefaultResolver.LookupIP(ctx, "ip", query)
	if err != nil {
		return nil, "", fmt.Errorf("resolve domain: %w", err)
	}
	if len(records) == 0 {
		return nil, "", fmt.Errorf("no ip records found")
	}

	unique := dedupeIPs(records)
	return unique, "domain", nil
}

func dedupeIPs(ips []net.IP) []net.IP {
	seen := make(map[string]struct{}, len(ips))
	out := make([]net.IP, 0, len(ips))
	for _, ip := range ips {
		key := ip.String()
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, ip)
	}

	slices.SortFunc(out, func(a, b net.IP) int {
		return strings.Compare(classifyIP(a)+a.String(), classifyIP(b)+b.String())
	})

	return out
}

func parseRegion(ip, family, raw string) model.LookupResult {
	parts := strings.Split(raw, "|")
	result := model.LookupResult{
		IP:     ip,
		Family: family,
	}

	if len(parts) < 5 {
		for len(parts) < 5 {
			parts = append(parts, "")
		}

		result.Country = parts[0]
		result.Province = parts[1]
		result.City = parts[2]
		result.ISP = parts[3]
		result.ISOCode = parts[4]
		return result
	}

	cursor := 0
	if len(parts) >= 2 && isNumeric(parts[0]) && isNumeric(parts[1]) {
		result.StartNum = parts[0]
		result.EndNum = parts[1]
		cursor = 2
	}

	remaining := parts[cursor:]
	if len(remaining) < 8 {
		result.Country = at(remaining, 0)
		result.Province = at(remaining, 1)
		result.City = at(remaining, 2)
		result.ISP = at(remaining, 3)
		result.ISOCode = at(remaining, 4)
		return result
	}

	hasContinent := len(remaining) >= 15
	if hasContinent {
		result.Continent = at(remaining, 0)
		result.Country = at(remaining, 1)
		result.Province = at(remaining, 2)
		result.City = at(remaining, 3)
		result.District = at(remaining, 4)
		result.ISP = at(remaining, 5)
		result.Longitude = at(remaining, 6)
		result.Latitude = at(remaining, 7)
		result.AreaCode = at(remaining, 8)
		result.CityCode = at(remaining, 9)
		result.ZipCode = at(remaining, 10)
		result.TimeZone = at(remaining, 11)
		result.Currency = at(remaining, 12)
		trailing := remaining[13:]
		fillTrailing(&result, trailing)
		return result
	}

	result.Country = at(remaining, 0)
	result.Province = at(remaining, 1)
	result.City = at(remaining, 2)
	result.District = at(remaining, 3)
	result.ISP = at(remaining, 4)
	result.Longitude = at(remaining, 5)
	result.Latitude = at(remaining, 6)
	result.AreaCode = at(remaining, 7)
	result.CityCode = at(remaining, 8)
	result.ZipCode = at(remaining, 9)
	result.TimeZone = at(remaining, 10)
	result.Currency = at(remaining, 11)
	trailing := remaining[12:]
	fillTrailing(&result, trailing)
	return result
}

func fillTrailing(result *model.LookupResult, trailing []string) {
	switch len(trailing) {
	case 0:
		return
	case 1:
		result.Elevation = at(trailing, 0)
	case 2:
		result.Elevation = at(trailing, 0)
		result.CountryChar = at(trailing, 1)
	case 3:
		result.ASN = at(trailing, 0)
		result.Elevation = at(trailing, 1)
		result.CountryChar = at(trailing, 2)
	default:
		result.ASN = at(trailing, 0)
		result.Elevation = at(trailing, 1)
		result.WeatherStation = at(trailing, 2)
		result.CountryChar = lastNonEmpty(trailing[3:])
		if result.ISOCode == "" {
			result.ISOCode = result.CountryChar
		}
	}
}

func at(parts []string, idx int) string {
	if idx < 0 || idx >= len(parts) {
		return ""
	}
	return parts[idx]
}

func isNumeric(value string) bool {
	if value == "" {
		return false
	}
	_, err := strconv.ParseInt(value, 10, 64)
	return err == nil
}

func lastNonEmpty(parts []string) string {
	for i := len(parts) - 1; i >= 0; i-- {
		if strings.TrimSpace(parts[i]) != "" {
			return parts[i]
		}
	}
	return ""
}

func classifyIP(ip net.IP) string {
	if ip.To4() != nil {
		return "ipv4"
	}
	return "ipv6"
}
