package main

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/safety/encryption"
	"fmt"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	// Initialize configuration
	config.LoadConfig()

	// Connect to MongoDB
	database.Connect()

	fmt.Printf("Connected to Database: %s\n", config.AppConfig.DatabaseName)
	collection := database.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Find all users
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to retrieve users from database: %v", err)
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		log.Fatalf("Failed to decode users: %v", err)
	}

	var updatedCount int
	var skippedCount int
	var errorCount int

	fmt.Println("Starting Database Migration: Encrypting User Emails...")
	fmt.Printf("Found %d users in the database.\n\n", len(users))

	for _, user := range users {
		email := user.Email

		// Quick check: if the email is short or contains '@', it is likely plaintext.
		// Base64 encrypted strings are usually long and don't contain '@' inherently like emails do.
		if len(email) < 30 || strings.Contains(email, "@") {
			// Encrypt the plaintext email
			encryptedEmail, err := encryption.Encrypt(strings.ToLower(email))
			if err != nil {
				log.Printf("❌ Failed to encrypt email for user %s: %v", user.Username, err)
				errorCount++
				continue
			}

			// Update the document in MongoDB with the encrypted string
			update := bson.M{
				"$set": bson.M{
					"email":      encryptedEmail,
					"updated_at": time.Now(),
				},
			}

			_, err = collection.UpdateOne(ctx, bson.M{"_id": user.ID}, update)
			if err != nil {
				log.Printf("❌ Failed to update encrypted email in DB for user %s: %v", user.Username, err)
				errorCount++
				continue
			}

			fmt.Printf("✅ Encrypted email for user: @%s\n", user.Username)
			updatedCount++
		} else {
			// Email string is long and has no '@', so we assume it is already a base64 encrypted string.
			fmt.Printf("⏭️ Skipped user @%s (Email already appears to be encrypted).\n", user.Username)
			skippedCount++
		}
	}

	fmt.Println("\n==================================")
	fmt.Println("🚀 Migration Completed!")
	fmt.Printf("Users successfully migrated: %d\n", updatedCount)
	fmt.Printf("Users skipped (already encrypted): %d\n", skippedCount)
	fmt.Printf("Errors encountered: %d\n", errorCount)
	fmt.Println("==================================")

}
