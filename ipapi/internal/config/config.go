package config

import (
	"bufio"
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

	IPAPIBaseURL string
	IPAPIKey     string
	IPAPIFields  string
	IPAPILang    string
	IPAPITimeout time.Duration
	QueryTimeout time.Duration
}

func Load() Config {
	return Config{
		AppHost:            env("APP_HOST", "0.0.0.0"),
		AppPort:            env("APP_PORT", "18084"),
		PublicBaseURL:      env("APP_PUBLIC_BASE_URL", "https://ipx.ee"),
		CORSAllowedOrigins: splitCSV(env("APP_CORS_ALLOWED_ORIGINS", "*")),
		IPAPIBaseURL:       env("IPAPI_BASE_URL", "https://pro.ip-api.com/json"),
		IPAPIKey:           env("IPAPI_KEY", ""),
		IPAPIFields:        env("IPAPI_FIELDS", "status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query"),
		IPAPILang:          env("IPAPI_LANG", "zh-CN"),
		IPAPITimeout:       envDuration("IPAPI_TIMEOUT", 5*time.Second),
		QueryTimeout:       envDuration("QUERY_TIMEOUT", 6*time.Second),
	}
}

func (c Config) ListenAddr() string {
	return c.AppHost + ":" + c.AppPort
}

func LoadEnvFiles(paths ...string) {
	for _, path := range paths {
		loadEnvFile(path)
	}
}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if key == "" {
			continue
		}

		if _, exists := os.LookupEnv(key); exists {
			continue
		}

		_ = os.Setenv(key, value)
	}
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
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
