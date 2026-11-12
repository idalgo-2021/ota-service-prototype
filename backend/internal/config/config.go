package config

import (
	"errors"
	"fmt"
	"math"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	HttpServerPort     string
	DatabaseURL        string
	JWTSecret          string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
	Lifetimes          Lifetimes
	DefaultListLimit   int
	MaxListLimit       int
	MaxSearchRadiusM   float64
	LogLevel           string
	BaseCurrency       string
	MediaDir           string
	FFmpegPath         string
	AIServiceBaseURL   string
	AIInternalAPIKey   string
	HttpReadTimeout    time.Duration
	HttpWriteTimeout   time.Duration
	HttpIdleTimeout    time.Duration

	// Database pool settings
	DBMaxConns        int32
	DBMinConns        int32
	DBMaxConnIdleTime time.Duration
	DBMaxConnLifetime time.Duration
}

type Lifetimes struct {
	PendingOrder time.Duration
	ReviewDraft  time.Duration
}

// LoadLifetimes is shared by the API and the maintenance command.
func LoadLifetimes() (Lifetimes, error) {
	order, err := readEnvDuration("PENDING_ORDER_LIFETIME_HOURS", 24, time.Hour)
	if err != nil {
		return Lifetimes{}, err
	}
	review, err := readEnvDuration("REVIEW_DRAFT_LIFETIME_HOURS", 168, time.Hour)
	if err != nil {
		return Lifetimes{}, err
	}
	if order <= 0 || review <= 0 {
		return Lifetimes{}, fmt.Errorf("PENDING_ORDER_LIFETIME_HOURS and REVIEW_DRAFT_LIFETIME_HOURS must be positive")
	}
	return Lifetimes{PendingOrder: order, ReviewDraft: review}, nil
}

func LoadConfig(path string) (*Config, error) {
	if path != "" {
		if err := godotenv.Load(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("load environment file: %w", err)
		}
	}

	databaseURL, err := BuildDatabaseURL()
	if err != nil {
		return nil, err
	}

	accessExpiry, err := readEnvDuration("ACCESS_TOKEN_EXPIRY_MINUTES", 15, time.Minute)
	if err != nil {
		return nil, err
	}
	refreshExpiry, err := readEnvDuration("REFRESH_TOKEN_EXPIRY_HOURS", 168, time.Hour)
	if err != nil {
		return nil, err
	}
	lifetimes, err := LoadLifetimes()
	if err != nil {
		return nil, err
	}
	readTimeout, err := readEnvDuration("HTTP_READ_TIMEOUT_SECONDS", 15, time.Second)
	if err != nil {
		return nil, err
	}
	writeTimeout, err := readEnvDuration("HTTP_WRITE_TIMEOUT_SECONDS", 120, time.Second)
	if err != nil {
		return nil, err
	}
	idleTimeout, err := readEnvDuration("HTTP_IDLE_TIMEOUT_SECONDS", 60, time.Second)
	if err != nil {
		return nil, err
	}
	maxConnIdleTime, err := readEnvDuration("DB_MAX_CONN_IDLE_TIME_MINUTES", 30, time.Minute)
	if err != nil {
		return nil, err
	}
	maxConnLifetime, err := readEnvDuration("DB_MAX_CONN_LIFETIME_MINUTES", 60, time.Minute)
	if err != nil {
		return nil, err
	}

	port := getEnv("HTTP_SERVER_PORT", "8080")
	defaultLimit, err := readEnvInt("DEFAULT_LIST_LIMIT", 20)
	if err != nil {
		return nil, err
	}
	maxLimit, err := readEnvInt("MAX_LIST_LIMIT", 100)
	if err != nil {
		return nil, err
	}
	maxSearchRadiusM, err := readEnvFloat("MAX_SEARCH_RADIUS_M", 5000)
	if err != nil {
		return nil, err
	}
	dbMaxConns, err := readEnvInt("DB_MAX_CONNS", 10)
	if err != nil {
		return nil, err
	}
	dbMinConns, err := readEnvInt("DB_MIN_CONNS", 2)
	if err != nil {
		return nil, err
	}
	if dbMaxConns > math.MaxInt32 || dbMinConns > math.MaxInt32 {
		return nil, fmt.Errorf("DB_MAX_CONNS and DB_MIN_CONNS must be at most %d", math.MaxInt32)
	}

	cfg := &Config{
		HttpServerPort:     port,
		DatabaseURL:        databaseURL,
		JWTSecret:          getEnv("JWT_SECRET", ""),
		AccessTokenExpiry:  accessExpiry,
		RefreshTokenExpiry: refreshExpiry,
		Lifetimes:          lifetimes,
		DefaultListLimit:   defaultLimit,
		MaxListLimit:       maxLimit,
		MaxSearchRadiusM:   maxSearchRadiusM,
		LogLevel:           strings.ToLower(getEnv("LOG_LEVEL", "info")),
		BaseCurrency:       strings.ToUpper(getEnv("BASE_CURRENCY", "RUB")),
		MediaDir:           getEnv("MEDIA_DIR", "_media"),
		FFmpegPath:         getEnv("FFMPEG_PATH", "ffmpeg"),
		AIServiceBaseURL:   strings.TrimRight(getEnv("AI_SERVICE_BASE_URL", "http://localhost:8090"), "/"),
		AIInternalAPIKey:   getEnv("AI_INTERNAL_API_KEY", ""),
		HttpReadTimeout:    readTimeout,
		HttpWriteTimeout:   writeTimeout,
		HttpIdleTimeout:    idleTimeout,
		DBMaxConns:         int32(dbMaxConns),
		DBMinConns:         int32(dbMinConns),
		DBMaxConnIdleTime:  maxConnIdleTime,
		DBMaxConnLifetime:  maxConnLifetime,
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

// BuildDatabaseURL constructs a PostgreSQL URL from individual environment
// variables when DATABASE_URL is not set. URL components are escaped so special
// characters in credentials or database names do not corrupt the URL.
func BuildDatabaseURL() (string, error) {
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		if err := validateDatabaseURL(databaseURL); err != nil {
			return "", err
		}
		return databaseURL, nil
	}

	host := strings.Trim(getEnv("POSTGRES_HOST", "localhost"), "[]")
	port := getEnv("POSTGRES_PORT", "5432")
	user := getEnv("POSTGRES_USER", "user")
	password := getEnv("POSTGRES_PASSWORD", "password")
	database := getEnv("POSTGRES_DB", "postgresdb")

	if strings.TrimSpace(host) == "" {
		return "", fmt.Errorf("POSTGRES_HOST is required")
	}
	if user == "" {
		return "", fmt.Errorf("POSTGRES_USER is required")
	}
	if database == "" {
		return "", fmt.Errorf("POSTGRES_DB is required")
	}
	if err := validatePort("POSTGRES_PORT", port); err != nil {
		return "", err
	}

	escapedDatabase := url.PathEscape(database)
	connectionURL := url.URL{
		Scheme:  "postgresql",
		User:    url.UserPassword(user, password),
		Host:    net.JoinHostPort(host, port),
		Path:    "/" + database,
		RawPath: "/" + escapedDatabase,
	}
	builtURL := connectionURL.String()
	if err := validateDatabaseURL(builtURL); err != nil {
		return "", err
	}
	return builtURL, nil
}

func (c *Config) validate() error {
	if err := validatePort("HTTP_SERVER_PORT", c.HttpServerPort); err != nil {
		return err
	}
	if err := validateDatabaseURL(c.DatabaseURL); err != nil {
		return err
	}
	if len(c.BaseCurrency) != 3 || strings.ContainsFunc(c.BaseCurrency, func(r rune) bool { return r < 'A' || r > 'Z' }) {
		return fmt.Errorf("BASE_CURRENCY must be a three-letter uppercase ISO code")
	}
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must contain at least 32 bytes")
	}
	if c.AccessTokenExpiry <= 0 || c.RefreshTokenExpiry <= 0 {
		return fmt.Errorf("access and refresh token expiries must be positive")
	}
	if c.DefaultListLimit < 1 || c.MaxListLimit < 1 || c.DefaultListLimit > c.MaxListLimit {
		return fmt.Errorf("list limits must be positive and DEFAULT_LIST_LIMIT must not exceed MAX_LIST_LIMIT")
	}
	if math.IsNaN(c.MaxSearchRadiusM) || math.IsInf(c.MaxSearchRadiusM, 0) || c.MaxSearchRadiusM < 1000 {
		return fmt.Errorf("MAX_SEARCH_RADIUS_M must be a finite number of at least 1000")
	}
	if c.HttpReadTimeout <= 0 || c.HttpWriteTimeout <= 0 || c.HttpIdleTimeout <= 0 {
		return fmt.Errorf("HTTP timeouts must be positive")
	}
	if c.DBMaxConns < 1 || c.DBMinConns < 0 || c.DBMinConns > c.DBMaxConns {
		return fmt.Errorf("database pool limits must satisfy 1 <= DB_MAX_CONNS and 0 <= DB_MIN_CONNS <= DB_MAX_CONNS")
	}
	if c.DBMaxConnIdleTime <= 0 || c.DBMaxConnLifetime <= 0 {
		return fmt.Errorf("database connection idle time and lifetime must be positive")
	}
	switch c.LogLevel {
	case "debug", "info", "warn", "error":
	default:
		return fmt.Errorf("LOG_LEVEL must be one of: debug, info, warn, error")
	}
	return nil
}

func validateDatabaseURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid PostgreSQL connection URL: %w", err)
	}
	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return fmt.Errorf("DATABASE_URL scheme must be postgres or postgresql")
	}
	if u.Hostname() == "" {
		return fmt.Errorf("DATABASE_URL must include a host")
	}
	if u.Path == "" || u.Path == "/" {
		return fmt.Errorf("DATABASE_URL must include a database name")
	}
	if port := u.Port(); port != "" {
		if err := validatePort("DATABASE_URL port", port); err != nil {
			return err
		}
	}
	return nil
}

func validatePort(name, value string) error {
	port, err := strconv.Atoi(value)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("%s must be an integer between 1 and 65535", name)
	}
	return nil
}

func readEnvInt(key string, defaultValue int) (int, error) {
	value, exists := os.LookupEnv(key)
	if !exists || value == "" {
		return defaultValue, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer: %w", key, err)
	}
	return parsed, nil
}

func readEnvFloat(key string, defaultValue float64) (float64, error) {
	value, exists := os.LookupEnv(key)
	if !exists || value == "" {
		return defaultValue, nil
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, fmt.Errorf("%s must be a number: %w", key, err)
	}
	return parsed, nil
}

func readEnvDuration(key string, defaultValue int, unit time.Duration) (time.Duration, error) {
	value, err := readEnvInt(key, defaultValue)
	if err != nil {
		return 0, err
	}
	if int64(value) > math.MaxInt64/int64(unit) || int64(value) < math.MinInt64/int64(unit) {
		return 0, fmt.Errorf("%s is too large", key)
	}
	return time.Duration(value) * unit, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
