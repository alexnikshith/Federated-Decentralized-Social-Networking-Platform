package main

import (
	"context"
	"federated-social/backend/config"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Load config from .env file
	config.LoadConfig()

	uri := config.AppConfig.MongoURI
	dbName := config.AppConfig.DatabaseName

	fmt.Printf("Cleaning up MongoDB indexes...\n")
	fmt.Printf("Database: %s\n\n", dbName)

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database(dbName)
	collection := db.Collection("remote_follows")

	// List current indexes
	cursor, err := collection.Indexes().List(context.Background())
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Current indexes:")
	var indexes []bson.M
	if err = cursor.All(context.Background(), &indexes); err != nil {
		log.Fatal(err)
	}
	for _, idx := range indexes {
		fmt.Printf("  %+v\n", idx)
	}

	// Drop all the incorrect indexes
	incorrectIndexes := []string{
		"activity_id_1",
		"follower_actor_id_1_following_actor_id_1",
		"origin_instance_1",
		"status_1",
	}

	fmt.Println("\nDropping incorrect indexes...")
	for _, idxName := range incorrectIndexes {
		_, err = collection.Indexes().DropOne(context.Background(), idxName)
		if err != nil {
			fmt.Printf("  %s: Error (might not exist): %v\n", idxName, err)
		} else {
			fmt.Printf("  %s: Successfully dropped\n", idxName)
		}
	}

	// List indexes after cleanup
	cursor2, _ := collection.Indexes().List(context.Background())
	var indexesAfter []bson.M
	cursor2.All(context.Background(), &indexesAfter)

	fmt.Println("\nIndexes after cleanup:")
	for _, idx := range indexesAfter {
		fmt.Printf("  %+v\n", idx)
	}

	fmt.Println("\nDone! The remote_follows collection now has only the correct indexes.")
}
