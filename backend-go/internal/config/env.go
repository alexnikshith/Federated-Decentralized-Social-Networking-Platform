package config

import (
	"log"
	"os"
)

type Config struct {
	Port       string
	MongoURI   string
	JWTSecret  string
}

func Load() *Config {
	cfg := &Config{
		Port:      getEnv("PORT", "8080"),
		MongoURI:  getEnv("MONGO_URI", ""),
		JWTSecret: getEnv("JWT_SECRET", ""),
	}

	if cfg.JWTSecret == "" {
		log.Println("⚠️  JWT_SECRET is not set (ok for now)")
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}
