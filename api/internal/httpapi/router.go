package httpapi

import (
	"encoding/json"
	"net"
	"net/http"
	"net/netip"
	"regexp"
	"strings"
	"time"

	"ip2region.io/api/internal/config"
	"ip2region.io/api/internal/iplookup"
	"ip2region.io/api/internal/metrics"
	"ip2region.io/api/internal/model"
	"ip2region.io/api/internal/sslcheck"
	"ip2region.io/api/internal/updater"
)

var jsonpCallbackPattern = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$\.]*$`)

type router struct {
	cfg      config.Config
	lookup   *iplookup.Service
	metrics  *metrics.Store
	sslCheck sslcheck.Service
	updater  *updater.Manager
}

type geoIPResponse struct {
	IP          string `json:"ip"`
	ASN         string `json:"asn,omitempty"`
	ISP         string `json:"isp,omitempty"`
	Continent   string `json:"continent,omitempty"`
	CountryCode string `json:"country_code,omitempty"`
	Country     string `json:"country,omitempty"`
	Region      string `json:"region,omitempty"`
	Province    string `json:"province,omitempty"`
	City        string `json:"city,omitempty"`
	District    string `json:"district,omitempty"`
	AreaCode    string `json:"area_code,omitempty"`
	PhoneCode   string `json:"phone_code,omitempty"`
	PostalCode  string `json:"postal_code,omitempty"`
	ZipCode     string `json:"zip_code,omitempty"`
	Latitude    string `json:"latitude,omitempty"`
	Longitude   string `json:"longitude,omitempty"`
	TimeZone    string `json:"timezone,omitempty"`
	Currency    string `json:"currency,omitempty"`
	Flag        string `json:"flag,omitempty"`
}

func NewRouter(cfg config.Config, lookup *iplookup.Service, updater *updater.Manager, metricsStore *metrics.Store) http.Handler {
	r := &router{
		cfg:      cfg,
		lookup:   lookup,
		metrics:  metricsStore,
		sslCheck: sslcheck.New(cfg.SSLCheckTimeout),
		updater:  updater,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", r.handleSelf)
	mux.HandleFunc("/healthz", r.handleHealth)
	mux.HandleFunc("/lookup", r.handleLookup)
	mux.HandleFunc("/geoip", r.handleGeoIP)
	mux.HandleFunc("/geoip/", r.handleGeoIP)
	mux.HandleFunc("/ssl", r.handleSSL)
	mux.HandleFunc("/ssl/", r.handleSSL)
	mux.HandleFunc("/metrics", r.handleMetrics)
	mux.HandleFunc("/stats", r.handleStats)

	return r.withCORS(r.withMetrics(r.withLogging(mux)))
}

func (r *router) handleStats(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if r.metrics == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "stats unavailable"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"requests": r.metrics.Snapshot(),
	})
}

func (r *router) handleMetrics(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if !r.isAuthorized(req) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.metrics == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "metrics unavailable"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"requests": r.metrics.Snapshot(),
	})
}

func (r *router) handleSSL(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	host := ""
	if strings.HasPrefix(req.URL.Path, "/ssl/") {
		host = strings.TrimSpace(strings.TrimPrefix(req.URL.Path, "/ssl/"))
	}
	if host == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "host is required"})
		return
	}

	ctx, cancel := timeBoundContext(req, r.cfg.SSLCheckTimeout)
	defer cancel()

	result, err := r.sslCheck.Check(ctx, host)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (r *router) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true,
	})
}

func (r *router) handleSelf(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path != "/" {
		http.NotFound(w, req)
		return
	}

	ip, _ := realClientIP(req)
	if ip == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unable to detect client ip"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"ip": ip,
	})
}

func (r *router) handleLookup(w http.ResponseWriter, req *http.Request) {
	query := strings.TrimSpace(req.URL.Query().Get("q"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "q is required"})
		return
	}

	ctx, cancel := timeBoundContext(req, 5*time.Second)
	defer cancel()

	result, err := r.lookup.Lookup(ctx, query, req.URL.Query().Get("resolver"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	r.setDatabaseHeaders(w)
	writeJSON(w, http.StatusOK, result)
}

func (r *router) handleGeoIP(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		writeGeoResponse(w, req, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var query string
	switch path := req.URL.Path; {
	case path == "/geoip" || path == "/geoip/":
		ip, _ := realClientIP(req)
		if ip == "" {
			writeGeoResponse(w, req, http.StatusBadRequest, map[string]string{"error": "unable to detect client ip"})
			return
		}
		query = ip
	case strings.HasPrefix(path, "/geoip/"):
		query = strings.TrimSpace(strings.TrimPrefix(path, "/geoip/"))
		if query == "" {
			writeGeoResponse(w, req, http.StatusBadRequest, map[string]string{"error": "ip is required"})
			return
		}
	default:
		writeGeoResponse(w, req, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	ctx, cancel := timeBoundContext(req, 5*time.Second)
	defer cancel()

	result, err := r.lookup.Lookup(ctx, query, "")
	if err != nil {
		writeGeoResponse(w, req, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if len(result.Results) == 0 {
		writeGeoResponse(w, req, http.StatusNotFound, map[string]string{"error": "no result found"})
		return
	}

	r.setDatabaseHeaders(w)
	writeGeoResponse(w, req, http.StatusOK, flattenGeoIPResult(result.Results[0]))
}

func flattenGeoIPResult(result model.LookupResult) geoIPResponse {
	countryCode := result.CountryChar
	if countryCode == "" {
		countryCode = result.ISOCode
	}
	flag := ""
	if countryCode != "" {
		flag = "https://flagcdn.io/" + strings.ToLower(countryCode) + ".svg"
	}

	return geoIPResponse{
		IP:          result.IP,
		ASN:         result.ASN,
		ISP:         result.ISP,
		Continent:   result.Continent,
		CountryCode: countryCode,
		Country:     result.Country,
		Region:      result.Province,
		Province:    result.Province,
		City:        result.City,
		District:    result.District,
		AreaCode:    result.AreaCode,
		PhoneCode:   result.CityCode,
		PostalCode:  result.ZipCode,
		ZipCode:     result.ZipCode,
		Latitude:    result.Latitude,
		Longitude:   result.Longitude,
		TimeZone:    result.TimeZone,
		Currency:    result.Currency,
		Flag:        flag,
	}
}

func (r *router) withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, req)
		_ = started
	})
}

func (r *router) withMetrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if r.shouldCountRequest(req) {
			r.metrics.Increment()
		}
		next.ServeHTTP(w, req)
	})
}

func (r *router) shouldCountRequest(req *http.Request) bool {
	if r.metrics == nil || req.Method == http.MethodOptions {
		return false
	}

	switch req.URL.Path {
	case "/healthz", "/metrics", "/stats":
		return false
	default:
		return true
	}
}

func (r *router) isAuthorized(req *http.Request) bool {
	if r.cfg.AdminToken == "" {
		return false
	}

	token := strings.TrimSpace(req.URL.Query().Get("token"))
	if token == "" {
		const prefix = "Bearer "
		auth := strings.TrimSpace(req.Header.Get("Authorization"))
		if strings.HasPrefix(auth, prefix) {
			token = strings.TrimSpace(strings.TrimPrefix(auth, prefix))
		}
	}

	return token == r.cfg.AdminToken
}

func (r *router) setDatabaseHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Expose-Headers", "X-DB-Updated-At, X-DB-Version")
	if createdDate := r.lookup.LatestDatabaseCreatedDate(); createdDate != "" {
		w.Header().Set("X-DB-Updated-At", createdDate)
	}
	if version := r.lookup.LatestDatabaseVersion(); version != "" {
		w.Header().Set("X-DB-Version", version)
	}
}

func (r *router) withCORS(next http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(r.cfg.CORSAllowedOrigins))
	for _, origin := range r.cfg.CORSAllowedOrigins {
		allowed[origin] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		origin := req.Header.Get("Origin")
		if _, ok := allowed[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Expose-Headers", "X-DB-Updated-At, X-DB-Version")
		}

		if req.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, req)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeGeoResponse(w http.ResponseWriter, req *http.Request, status int, payload any) {
	callback := strings.TrimSpace(req.URL.Query().Get("callback"))
	if callback == "" {
		writeJSON(w, status, payload)
		return
	}

	if !jsonpCallbackPattern.MatchString(callback) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid callback"})
		return
	}

	body, err := json.Marshal(payload)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "encode response"})
		return
	}

	w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(callback + "("))
	_, _ = w.Write(body)
	_, _ = w.Write([]byte(")"))
}

func realClientIP(req *http.Request) (string, string) {
	candidates := []struct {
		source string
		value  string
	}{
		{source: "cf-connecting-ip", value: req.Header.Get("CF-Connecting-IP")},
		{source: "x-forwarded-for", value: forwardedForIP(req.Header.Get("X-Forwarded-For"))},
		{source: "x-real-ip", value: req.Header.Get("X-Real-IP")},
		{source: "remote-addr", value: remoteAddrIP(req.RemoteAddr)},
	}

	for _, item := range candidates {
		if ip := normalizeIP(item.value); ip != "" {
			return ip, item.source
		}
	}

	return "", ""
}

func forwardedForIP(value string) string {
	if value == "" {
		return ""
	}

	parts := strings.Split(value, ",")
	for _, part := range parts {
		if ip := normalizeIP(part); ip != "" {
			return ip
		}
	}

	return ""
}

func remoteAddrIP(value string) string {
	if value == "" {
		return ""
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(value))
	if err == nil {
		return host
	}

	return value
}

func normalizeIP(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	if strings.HasPrefix(value, "[") && strings.HasSuffix(value, "]") {
		value = strings.TrimPrefix(strings.TrimSuffix(value, "]"), "[")
	}

	addr, err := netip.ParseAddr(value)
	if err != nil {
		return ""
	}

	return addr.String()
}
