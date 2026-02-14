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
	config.LoadConfig()

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(config.AppConfig.MongoURI))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database(config.AppConfig.DatabaseName)

	// Check instances
	fmt.Println("=== Federated Instances ===")
	cursor, _ := db.Collection("federation_instances").Find(context.Background(), bson.M{})
	var instances []bson.M
	cursor.All(context.Background(), &instances)

	for _, i := range instances {
		fmt.Printf("Domain: %v, InboxURL: %v\n", i["domain"], i["inbox_url"])
	}
}
