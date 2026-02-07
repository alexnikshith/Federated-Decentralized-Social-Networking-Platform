package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

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
	InstanceName      string
	InstanceDomain    string
	FederationEnabled bool
}

var AppConfig *Config

// LoadConfig loads environment variables and initializes the config
func LoadConfig() {
	// Try loading .env from the current directory, then fallback to parent directory
	if err := godotenv.Load(); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("No .env file found, using environment variables and defaults")
		}
	}

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
		InstanceName:      getEnv("INSTANCE_NAME", "default-instance"),
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
