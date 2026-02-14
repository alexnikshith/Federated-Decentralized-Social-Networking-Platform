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

	// Update remote_users: backend2:8080 -> localhost:8081
	result1, _ := db.Collection("remote_users").UpdateMany(
		context.Background(),
		bson.M{"instance": "backend2:8080"},
		bson.M{"$set": bson.M{"instance": "localhost:8081"}},
	)
	fmt.Printf("Updated %d remote_users from backend2:8080 to localhost:8081\n", result1.ModifiedCount)

	// Update remote_users: backend:8080 -> localhost:8080
	result2, _ := db.Collection("remote_users").UpdateMany(
		context.Background(),
		bson.M{"instance": "backend:8080"},
		bson.M{"$set": bson.M{"instance": "localhost:8080"}},
	)
	fmt.Printf("Updated %d remote_users from backend:8080 to localhost:8080\n", result2.ModifiedCount)

	// Update remote_followers: backend2:8080 -> localhost:8081
	result3, _ := db.Collection("remote_followers").UpdateMany(
		context.Background(),
		bson.M{"remote_instance": "backend2:8080"},
		bson.M{"$set": bson.M{"remote_instance": "localhost:8081"}},
	)
	fmt.Printf("Updated %d remote_followers from backend2:8080 to localhost:8081\n", result3.ModifiedCount)

	// Update remote_follows: backend2:8080 -> localhost:8081
	result4, _ := db.Collection("remote_follows").UpdateMany(
		context.Background(),
		bson.M{"remote_instance": "backend2:8080"},
		bson.M{"$set": bson.M{"remote_instance": "localhost:8081"}},
	)
	fmt.Printf("Updated %d remote_follows from backend2:8080 to localhost:8081\n", result4.ModifiedCount)

	// Update remote_posts: backend2:8080 -> localhost:8081
	result5, _ := db.Collection("remote_posts").UpdateMany(
		context.Background(),
		bson.M{"origin_instance": "backend2:8080"},
		bson.M{"$set": bson.M{"origin_instance": "localhost:8081"}},
	)
	fmt.Printf("Updated %d remote_posts from backend2:8080 to localhost:8081\n", result5.ModifiedCount)

	fmt.Println("\n✅ Instance domain normalization complete!")
}
