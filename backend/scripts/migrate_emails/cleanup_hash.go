package main

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	"fmt"
	"log"
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

	// Find all documents where "email_hash" exists and remove that field via $unset
	filter := bson.M{"email_hash": bson.M{"$exists": true}}
	update := bson.M{"$unset": bson.M{"email_hash": ""}}

	result, err := collection.UpdateMany(ctx, filter, update)
	if err != nil {
		log.Fatalf("Failed to remove email_hash fields from database: %v", err)
	}

	fmt.Println("\n==================================")
	fmt.Println("🧹 Database Cleanup Completed!")
	fmt.Printf("Successfully removed dead 'email_hash' field from %d users.\n", result.ModifiedCount)
	fmt.Println("==================================")
}
