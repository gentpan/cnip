package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"regexp"
	"slices"
	"strings"

	"ip2region.io/ipapi/internal/config"
	"ip2region.io/ipapi/internal/model"
	"ip2region.io/ipapi/internal/provider"
)

var jsonpCallbackPattern = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$\.]*$`)

type router struct {
	cfg      config.Config
	provider *provider.Service
}

func NewRouter(cfg config.Config) http.Handler {
	r := &router{
		cfg:      cfg,
		provider: provider.NewService(cfg),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", r.handleSelf)
	mux.HandleFunc("/ip", r.handleSelf)
	mux.HandleFunc("/jsonip", r.handleJSONIP)
	mux.HandleFunc("/healthz", r.handleHealth)
	mux.HandleFunc("/meta", r.handleMeta)
	mux.HandleFunc("/lookup", r.handleLookup)
	mux.HandleFunc("/geoip", r.handleGeoIP)
	mux.HandleFunc("/geoip/", r.handleGeoIP)

	return r.withCORS(mux)
}

func (r *router) handleSelf(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path != "/" && req.URL.Path != "/ip" {
		http.NotFound(w, req)
		return
	}

	ip, _ := realClientIP(req)
	if ip == "" {
		http.Error(w, "unable to detect client ip", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = io.WriteString(w, ip)
}

func (r *router) handleJSONIP(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path != "/jsonip" {
		http.NotFound(w, req)
		return
	}

	ip, source := realClientIP(req)
	if ip == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unable to detect client ip"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"ip":     ip,
		"source": source,
	})
}

func (r *router) handleHealth(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path != "/healthz" {
		http.NotFound(w, req)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":       true,
		"service":  "ipapi",
		"provider": "ip-api",
	})
}

func (r *router) handleMeta(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path != "/meta" {
		http.NotFound(w, req)
		return
	}

	writeJSON(w, http.StatusOK, model.MetaResponse{
		Service:       "ipapi",
		PublicBaseURL: r.cfg.PublicBaseURL,
		Provider:      "ip-api",
		AllowedOrigin: r.cfg.CORSAllowedOrigins,
	})
}

func (r *router) handleLookup(w http.ResponseWriter, req *http.Request) {
	query := strings.TrimSpace(req.URL.Query().Get("q"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "q is required"})
		return
	}

	ctx, cancel := context.WithTimeout(req.Context(), r.cfg.QueryTimeout)
	defer cancel()

	ips, queryType, err := resolveInput(ctx, query)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result := model.LookupResponse{
		Query:       query,
		QueryType:   queryType,
		ResolvedIPs: make([]string, 0, len(ips)),
		Results:     make([]model.LookupResult, 0, len(ips)),
	}

	for _, ip := range ips {
		item, err := r.provider.Lookup(ctx, ip.String())
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}

		result.ResolvedIPs = append(result.ResolvedIPs, ip.String())
		result.Results = append(result.Results, item)
	}

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

	ctx, cancel := context.WithTimeout(req.Context(), r.cfg.QueryTimeout)
	defer cancel()

	ips, _, err := resolveInput(ctx, query)
	if err != nil {
		writeGeoResponse(w, req, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if len(ips) == 0 {
		writeGeoResponse(w, req, http.StatusNotFound, map[string]string{"error": "no result found"})
		return
	}

	result, err := r.provider.Lookup(ctx, ips[0].String())
	if err != nil {
		writeGeoResponse(w, req, http.StatusBadGateway, map[string]string{"error": err.Error()})
		return
	}

	writeGeoResponse(w, req, http.StatusOK, flattenGeoIP(result))
}

func flattenGeoIP(result model.LookupResult) model.GeoIPResponse {
	return model.GeoIPResponse{
		IP:            result.IP,
		Family:        result.Family,
		Continent:     result.Continent,
		ContinentCode: result.ContinentCode,
		Country:       result.Country,
		CountryCode:   result.CountryCode,
		Region:        result.Province,
		RegionCode:    result.RegionCode,
		City:          result.City,
		District:      result.District,
		PostalCode:    result.ZipCode,
		Latitude:      result.Latitude,
		Longitude:     result.Longitude,
		TimeZone:      result.TimeZone,
		Currency:      result.Currency,
		Offset:        result.Offset,
		ASN:           result.ASN,
		ISP:           result.ISP,
		Org:           result.Org,
		ASName:        result.ASName,
		Reverse:       result.Reverse,
		Mobile:        result.Mobile,
		Proxy:         result.Proxy,
		Hosting:       result.Hosting,
	}
}

func (r *router) withCORS(next http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(r.cfg.CORSAllowedOrigins))
	allowAll := false
	for _, origin := range r.cfg.CORSAllowedOrigins {
		if origin == "*" {
			allowAll = true
			continue
		}
		allowed[origin] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		origin := req.Header.Get("Origin")
		switch {
		case allowAll:
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		case origin != "":
			if _, ok := allowed[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			}
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

func resolveInput(ctx context.Context, query string) ([]net.IP, string, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, "", fmt.Errorf("query is required")
	}

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

	return dedupeIPs(records), "domain", nil
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

func classifyIP(ip net.IP) string {
	if ip.To4() != nil {
		return "ipv4"
	}
	return "ipv6"
}
