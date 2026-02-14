package main

import (
	"context"
	"federated-social/backend/config"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	config.LoadConfig()

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(config.AppConfig.MongoURI))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database(config.AppConfig.DatabaseName)

	// Check federation_events created in the last hour
	fmt.Println("=== Recent Federation Events (Last 1 Hour) ===")

	filter := bson.M{
		"created_at": bson.M{
			"$gte": time.Now().Add(-1 * time.Hour),
		},
	}

	cursor, _ := db.Collection("federation_events").Find(context.Background(), filter)
	var events []bson.M
	cursor.All(context.Background(), &events)

	fmt.Printf("Total events: %d\n", len(events))
	for _, e := range events {
		fmt.Printf("ID: %v, Type: %v, Target: %v, Status: %v, Error: %v\n",
			e["_id"], e["type"], e["target_instance"], e["status"], e["error"])
	}
}
