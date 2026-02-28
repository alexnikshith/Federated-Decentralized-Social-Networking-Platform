package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all the application configuration
type Config struct {
	Port         string
	MongoURI     string
	DatabaseName string
	JWTSecret    string
	SMTPFrom     string
	ResendAPIKey string

	// Federation settings
	InstanceName      string
	InstanceDomain    string
	FederationEnabled bool
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
		SMTPFrom:     getEnv("SMTP_FROM", "noreply@federated-social.com"),
		ResendAPIKey: getEnv("RESEND_API_KEY", ""),

		// Federation settings
		InstanceName:      getEnv("INSTANCE_ID", getEnv("INSTANCE_NAME", "Community 1")),
		InstanceDomain:    getEnv("INSTANCE_DOMAIN", "localhost:8080"),
		FederationEnabled: getEnvBool("FEDERATION_ENABLED", true),
	}

	log.Printf("Config loaded: Port=%s, DB=%s, Instance=%s, Federation=%v",
		AppConfig.Port, AppConfig.DatabaseName, AppConfig.InstanceName, AppConfig.FederationEnabled)
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
