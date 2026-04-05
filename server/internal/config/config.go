package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppHost            string
	AppPort            string
	PublicBaseURL      string
	CORSAllowedOrigins []string

	V4DBPath string
	V6DBPath string

	V4VersionURL  string
	V4DownloadURL string
	V6VersionURL  string
	V6DownloadURL string

	EnhanceEnabled bool
	EnhanceAPIBase string
	EnhanceAPIKey  string
	EnhanceFields  string
	EnhanceLang    string
	EnhanceTimeout time.Duration

	UpdateEnabled   bool
	UpdateTimezone  string
	UpdateTimeout   time.Duration
	UpdateUserAgent string
}

func Load() Config {
	return Config{
		AppHost:            env("APP_HOST", "0.0.0.0"),
		AppPort:            env("APP_PORT", "8080"),
		PublicBaseURL:      env("APP_PUBLIC_BASE_URL", "http://localhost:8080"),
		CORSAllowedOrigins: splitCSV(env("APP_CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
		V4DBPath:           env("IP2REGION_V4_DB", "../data/ip2region_v4.xdb"),
		V6DBPath:           env("IP2REGION_V6_DB", "../data/ip2region_v6.xdb"),
		V4VersionURL:       env("IP2REGION_V4_VERSION_URL", ""),
		V4DownloadURL:      env("IP2REGION_V4_DOWNLOAD_URL", ""),
		V6VersionURL:       env("IP2REGION_V6_VERSION_URL", ""),
		V6DownloadURL:      env("IP2REGION_V6_DOWNLOAD_URL", ""),
		EnhanceEnabled:     envBool("ENHANCE_ENABLED", false),
		EnhanceAPIBase:     env("ENHANCE_API_BASE", "https://pro.ip-api.com/json"),
		EnhanceAPIKey:      env("ENHANCE_API_KEY", ""),
		EnhanceFields:      env("ENHANCE_API_FIELDS", "status,message,continent,continentCode,country,countryCode,countryCode3,region,regionName,city,district,zip,lat,lon,timezone,offset,currentTime,currency,callingCode,isp,org,as,asname,reverse,mobile,proxy,hosting,query"),
		EnhanceLang:        env("ENHANCE_API_LANG", "zh-CN"),
		EnhanceTimeout:     envDuration("ENHANCE_TIMEOUT", 5*time.Second),
		UpdateEnabled:      envBool("UPDATE_ENABLED", true),
		UpdateTimezone:     env("UPDATE_TIMEZONE", "Asia/Shanghai"),
		UpdateTimeout:      envDuration("UPDATE_TIMEOUT", 10*time.Minute),
		UpdateUserAgent:    env("UPDATE_USER_AGENT", "ip2region-lookup/1.0"),
	}
}

func (c Config) ListenAddr() string {
	return c.AppHost + ":" + c.AppPort
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func splitCSV(value string) []string {
	items := strings.Split(value, ",")
	result := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item != "" {
			result = append(result, item)
		}
	}
	return result
}
