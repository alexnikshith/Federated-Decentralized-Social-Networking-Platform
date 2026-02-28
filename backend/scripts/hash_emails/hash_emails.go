package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
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

	// Get all users
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(context.TODO())

	var users []bson.M
	if err = cursor.All(context.TODO(), &users); err != nil {
		log.Fatal(err)
	}

	for _, user := range users {
		email, ok := user["email"].(string)
		if !ok || email == "" {
			continue
		}

		// Hash the email
		hash := sha256.Sum256([]byte(email))
		hashedEmail := hex.EncodeToString(hash[:])

		// Update user with hashed email
		update := bson.M{"$set": bson.M{"email_hash": hashedEmail}}
		_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": user["_id"]}, update)
		if err != nil {
			log.Printf("Failed to update user %v: %v", user["_id"], err)
		}
	}

	fmt.Printf("Successfully hashed emails for %d users in the database.\n", len(users))
}
