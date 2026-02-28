package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all the application configuration
type Config struct {
	Port         string
	MongoURI     string
	DatabaseName string
	JWTSecret    string
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	// Federation settings
	InstanceName       string
	InstanceDomain     string
	FederationEnabled  bool
	ActivityPubEnabled bool
}

// AppConfig represents the global configuration instance
var AppConfig *Config

// LoadConfig loads environment variables and initializes the config
// It attempts to load .env files and falls back to system environment variables
func LoadConfig() {
	// Try loading .env from the current directory, then fallback to parent directory for development convenience
	if err := godotenv.Load(); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("No .env file found, using environment variables and defaults")
		}
	}

	// Initialize the configuration with environment variables or default values
	AppConfig = &Config{
		Port:         getEnv("PORT", "8080"),
		MongoURI:     getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DatabaseName: getEnv("DB_NAME", "federated_social"),
		JWTSecret:    getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", "noreply@federated-social.com"),

		// Federation settings
		InstanceName:       getEnv("INSTANCE_ID", getEnv("INSTANCE_NAME", "Community 1")),
		InstanceDomain:     getEnv("INSTANCE_DOMAIN", "localhost:8080"),
		FederationEnabled:  getEnvBool("FEDERATION_ENABLED", true),
		ActivityPubEnabled: getEnvBool("ACTIVITYPUB_ENABLED", true),
	}

	log.Printf("Config loaded: Port=%s, DB=%s, Instance=%s, Federation=%v, ActivityPub=%v",
		AppConfig.Port, AppConfig.DatabaseName, AppConfig.InstanceName, AppConfig.FederationEnabled, AppConfig.ActivityPubEnabled)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
}

// BaseURL returns the base URL for this instance used to build ActivityPub IDs.
// Uses http:// for localhost/development, https:// for production domains.
func (c *Config) BaseURL() string {
	domain := c.InstanceDomain
	if domain == "" {
		domain = "localhost:8080"
	}
	if strings.HasPrefix(domain, "localhost") || strings.HasPrefix(domain, "127.0.0.1") {
		return "http://" + domain
	}
	return "https://" + domain
}
