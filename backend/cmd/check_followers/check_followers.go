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

	// Check remote_followers for riteesh
	fmt.Println("=== Remote Followers (who follows riteesh from other communities) ===")
	cursor, _ := db.Collection("remote_followers").Find(context.Background(), bson.M{})
	var followers []bson.M
	cursor.All(context.Background(), &followers)

	for _, f := range followers {
		fmt.Printf("LocalUser: %v, RemoteActor: %v, Instance: %v\n",
			f["local_user_id"], f["remote_actor_id"], f["remote_instance"])
	}

	fmt.Printf("\nTotal remote_followers: %d\n", len(followers))
}
