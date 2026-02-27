package main

import (
	"context"
	"fmt"
	"log"

	"federated-social/backend/config"
	"federated-social/backend/database"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	config.LoadConfig()
	database.Connect()

	collection := database.GetCollection("users")

	var user bson.M
	err := collection.FindOne(context.TODO(), bson.M{}).Decode(&user)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Here is a sample user document straight from your local database:")
	fmt.Printf("Username: %v\n", user["username"])
	fmt.Printf("Email: %v\n", user["email"])
	fmt.Printf("Password Hash: %v\n", user["password_hash"])

	// Also check if email_hash was added
	if emailHash, ok := user["email_hash"]; ok {
		fmt.Printf("Email Hash (from earlier): %v\n", emailHash)
	}
}
