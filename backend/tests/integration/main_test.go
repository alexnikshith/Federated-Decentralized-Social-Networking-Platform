package integration

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	"log"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	// Set environment variables for test
	os.Setenv("DB_NAME", "federated_social_integration_test")
	os.Setenv("JWT_SECRET", "test-secret")
	os.Setenv("ENCRYPTION_KEY", "12345678901234567890123456789012") // 32 bytes

	// Load configuration
	config.LoadConfig()

	// Override some configs if needed
	config.AppConfig.DatabaseName = "federated_social_integration_test"

	// Connect to database
	database.Connect()

	if database.DB == nil {
		log.Fatal("Failed to connect to database for integration tests")
	}

	// Clean start: Drop the test database if it exists
	ctx := context.Background()
	_ = database.DB.Drop(ctx)

	// Run tests
	code := m.Run()

	// Cleanup: Drop the test database
	if database.DB != nil {
		err := database.DB.Drop(ctx)
		if err != nil {
			log.Printf("Warning: Failed to drop test database: %v", err)
		}
	}

	os.Exit(code)
}
