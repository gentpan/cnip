package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"

	"ip2region.io/ipapi/internal/config"
	"ip2region.io/ipapi/internal/model"
)

type Service struct {
	baseURL string
	apiKey  string
	fields  string
	lang    string
	client  *http.Client
}

type apiResponse struct {
	Status        string  `json:"status"`
	Message       string  `json:"message"`
	Query         string  `json:"query"`
	Continent     string  `json:"continent"`
	ContinentCode string  `json:"continentCode"`
	Country       string  `json:"country"`
	CountryCode   string  `json:"countryCode"`
	Region        string  `json:"region"`
	RegionName    string  `json:"regionName"`
	City          string  `json:"city"`
	District      string  `json:"district"`
	Zip           string  `json:"zip"`
	Lat           float64 `json:"lat"`
	Lon           float64 `json:"lon"`
	Timezone      string  `json:"timezone"`
	Offset        int     `json:"offset"`
	Currency      string  `json:"currency"`
	ISP           string  `json:"isp"`
	Org           string  `json:"org"`
	AS            string  `json:"as"`
	ASName        string  `json:"asname"`
	Reverse       string  `json:"reverse"`
	Mobile        bool    `json:"mobile"`
	Proxy         bool    `json:"proxy"`
	Hosting       bool    `json:"hosting"`
}

func NewService(cfg config.Config) *Service {
	return &Service{
		baseURL: strings.TrimRight(cfg.IPAPIBaseURL, "/"),
		apiKey:  strings.TrimSpace(cfg.IPAPIKey),
		fields:  strings.TrimSpace(cfg.IPAPIFields),
		lang:    strings.TrimSpace(cfg.IPAPILang),
		client: &http.Client{
			Timeout: cfg.IPAPITimeout,
		},
	}
}

func (s *Service) Lookup(ctx context.Context, ip string) (model.LookupResult, error) {
	ip = strings.TrimSpace(ip)
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return model.LookupResult{}, fmt.Errorf("invalid ip")
	}

	requestURL := s.baseURL + "/" + url.PathEscape(parsed.String())
	params := url.Values{}
	if s.fields != "" {
		params.Set("fields", s.fields)
	}
	if s.apiKey != "" {
		params.Set("key", s.apiKey)
	}
	if s.lang != "" {
		params.Set("lang", s.lang)
	}
	if encoded := params.Encode(); encoded != "" {
		requestURL += "?" + encoded
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return model.LookupResult{}, err
	}

	res, err := s.client.Do(req)
	if err != nil {
		return model.LookupResult{}, err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return model.LookupResult{}, fmt.Errorf("ip-api status: %s", res.Status)
	}

	var payload apiResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return model.LookupResult{}, err
	}
	if !strings.EqualFold(payload.Status, "success") {
		if payload.Message != "" {
			return model.LookupResult{}, fmt.Errorf("ip-api: %s", payload.Message)
		}
		return model.LookupResult{}, fmt.Errorf("ip-api: %s", payload.Status)
	}

	return model.LookupResult{
		IP:            parsed.String(),
		Family:        classifyIP(parsed),
		Continent:     payload.Continent,
		ContinentCode: payload.ContinentCode,
		Country:       payload.Country,
		CountryCode:   payload.CountryCode,
		RegionCode:    payload.Region,
		Province:      payload.RegionName,
		City:          payload.City,
		District:      payload.District,
		ZipCode:       payload.Zip,
		Latitude:      payload.Lat,
		Longitude:     payload.Lon,
		TimeZone:      payload.Timezone,
		Currency:      payload.Currency,
		Offset:        payload.Offset,
		ISP:           payload.ISP,
		Org:           payload.Org,
		ASN:           payload.AS,
		ASName:        payload.ASName,
		Reverse:       payload.Reverse,
		Mobile:        payload.Mobile,
		Proxy:         payload.Proxy,
		Hosting:       payload.Hosting,
	}, nil
}

func classifyIP(ip net.IP) string {
	if ip.To4() != nil {
		return "ipv4"
	}
	return "ipv6"
}
