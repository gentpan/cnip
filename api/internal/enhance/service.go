package enhance

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"ip2region.io/api/internal/config"
)

type Service struct {
	enabled bool
	baseURL string
	apiKey  string
	fields  string
	lang    string
	client  *http.Client
}

type Response struct {
	Query    string `json:"query"`
	Org      string `json:"org"`
	AS       string `json:"as"`
	ASName   string `json:"asname"`
	Reverse  string `json:"reverse"`
	Mobile   bool   `json:"mobile"`
	Proxy    bool   `json:"proxy"`
	Hosting  bool   `json:"hosting"`
	Enhanced bool   `json:"enhanced"`
}

type apiResponse struct {
	Status  string `json:"status"`
	Query   string `json:"query"`
	Org     string `json:"org"`
	AS      string `json:"as"`
	ASName  string `json:"asname"`
	Reverse string `json:"reverse"`
	Mobile  bool   `json:"mobile"`
	Proxy   bool   `json:"proxy"`
	Hosting bool   `json:"hosting"`
	Message string `json:"message"`
}

func NewService(cfg config.Config) *Service {
	return &Service{
		enabled: cfg.EnhanceEnabled && strings.TrimSpace(cfg.EnhanceAPIKey) != "",
		baseURL: strings.TrimRight(cfg.EnhanceAPIBase, "/"),
		apiKey:  strings.TrimSpace(cfg.EnhanceAPIKey),
		fields:  strings.TrimSpace(cfg.EnhanceFields),
		lang:    strings.TrimSpace(cfg.EnhanceLang),
		client: &http.Client{
			Timeout: cfg.EnhanceTimeout,
		},
	}
}

func (s *Service) Enabled() bool {
	return s != nil && s.enabled
}

func (s *Service) Lookup(ctx context.Context, query string) (*Response, error) {
	if !s.Enabled() {
		return nil, fmt.Errorf("enhance service disabled")
	}

	query = strings.TrimSpace(query)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}

	u := fmt.Sprintf("%s/%s?fields=%s&key=%s",
		s.baseURL,
		url.PathEscape(query),
		url.QueryEscape(s.fields),
		url.QueryEscape(s.apiKey),
	)
	if s.lang != "" {
		u += "&lang=" + url.QueryEscape(s.lang)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}

	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("enhance api status: %s", res.Status)
	}

	var payload apiResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if !strings.EqualFold(payload.Status, "success") {
		if payload.Message != "" {
			return nil, fmt.Errorf("enhance api: %s", payload.Message)
		}
		return nil, fmt.Errorf("enhance api: %s", payload.Status)
	}

	return &Response{
		Query:    payload.Query,
		Org:      payload.Org,
		AS:       payload.AS,
		ASName:   payload.ASName,
		Reverse:  payload.Reverse,
		Mobile:   payload.Mobile,
		Proxy:    payload.Proxy,
		Hosting:  payload.Hosting,
		Enhanced: true,
	}, nil
}

func TimeoutContext(parent context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, timeout)
}
