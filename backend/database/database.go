package database

import (
	"context"
	"federated-social/backend/config"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

// Connect establishes connection to MongoDB with retries
func Connect() {
	maxRetries := 5
	retryDelay := 10 * time.Second

	for attempt := 1; attempt <= maxRetries; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)

		clientOptions := options.Client().ApplyURI(config.AppConfig.MongoURI)
		client, err := mongo.Connect(ctx, clientOptions)
		cancel()

		if err != nil {
			log.Printf("Attempt %d/%d: Failed to connect to MongoDB: %v", attempt, maxRetries, err)
			if attempt < maxRetries {
				time.Sleep(retryDelay)
				continue
			}
			log.Fatal("Failed to connect to MongoDB after retries:", err)
		}

		// Ping the database
		ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
		if err := client.Ping(ctx, nil); err != nil {
			cancel()
			log.Printf("Attempt %d/%d: Failed to ping MongoDB: %v", attempt, maxRetries, err)
			if attempt < maxRetries {
				time.Sleep(retryDelay)
				continue
			}
			log.Fatal("Failed to ping MongoDB after retries:", err)
		}
		cancel()

		DB = client.Database(config.AppConfig.DatabaseName)
		log.Println("Connected to MongoDB successfully")
		return
	}
}

// GetCollection returns a MongoDB collection
func GetCollection(name string) *mongo.Collection {
	return DB.Collection(name)
}
