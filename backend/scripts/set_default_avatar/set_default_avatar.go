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
	config.LoadConfig()
	database.Connect()

	fmt.Printf("Connected to Database: %s\n", config.AppConfig.DatabaseName)
	collection := database.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Match users whose avatar_url is missing, empty, or null
	filter := bson.M{
		"$or": []bson.M{
			{"avatar_url": bson.M{"$exists": false}},
			{"avatar_url": nil},
			{"avatar_url": ""},
		},
	}

	update := bson.M{
		"$set": bson.M{
			"avatar_url": "/avatars/avatar_1.png",
		},
	}

	result, err := collection.UpdateMany(ctx, filter, update)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	fmt.Printf("\n==================================\n")
	fmt.Printf("✅ Avatar Migration Completed!\n")
	fmt.Printf("Users matched (no avatar): %d\n", result.MatchedCount)
	fmt.Printf("Users updated:             %d\n", result.ModifiedCount)
	fmt.Printf("==================================\n")
}
