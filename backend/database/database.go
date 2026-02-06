package database

import (
	"context"
	"federated-social/backend/config"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Global database variables
var DB *mongo.Database
var GridFS *gridfs.Bucket

// Connect establishes connection to MongoDB with retries
// It attempts to connect multiple times before failing to handle transient startup issues (e.g., docker composition)
func Connect() {
	maxRetries := 5
	retryDelay := 10 * time.Second

	for attempt := 1; attempt <= maxRetries; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)

		// Create client options from the URI
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

		// Ping the database to verify the connection is alive
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

		// Set the global database instance
		DB = client.Database(config.AppConfig.DatabaseName)

		// Initialize GridFS bucket for media storage (images, videos)
		var errBucket error
		GridFS, errBucket = gridfs.NewBucket(DB, options.GridFSBucket().SetName("messaging_media"))
		if errBucket != nil {
			log.Printf("Warning: Failed to initialize GridFS bucket: %v", errBucket)
		}

		log.Println("Connected to MongoDB and initialized GridFS successfully")
		return
	}
}

// GetCollection returns a MongoDB collection
func GetCollection(name string) *mongo.Collection {
	return DB.Collection(name)
}
