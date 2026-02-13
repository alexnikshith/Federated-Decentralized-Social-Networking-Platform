package main

import (
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	uri := "mongodb+srv://kaushal:mongodb_123@ecoquest.kntdk2q.mongodb.net/federated_social?retryWrites=true&w=majority"

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database("federated_social")
	collection := db.Collection("remote_follows")

	// List indexes
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

	// Drop the problematic index
	fmt.Println("\nDropping activity_id_1 index...")
	_, err = collection.Indexes().DropOne(context.Background(), "activity_id_1")
	if err != nil {
		fmt.Printf("Error (might not exist): %v\n", err)
	} else {
		fmt.Println("Successfully dropped activity_id_1 index")
	}

	// List indexes after
	cursor2, _ := collection.Indexes().List(context.Background())
	var indexesAfter []bson.M
	cursor2.All(context.Background(), &indexesAfter)

	fmt.Println("\nIndexes after drop:")
	for _, idx := range indexesAfter {
		fmt.Printf("  %+v\n", idx)
	}
}
