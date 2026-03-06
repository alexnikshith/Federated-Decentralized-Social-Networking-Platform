package main

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	config.LoadConfig()
	database.Connect()

	fmt.Printf("Connected to Database: %s\n", config.AppConfig.DatabaseName)

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	// ─────────────────────────────────────────────
	// 1. Collect all EXISTING user IDs
	// ─────────────────────────────────────────────
	usersColl := database.GetCollection("users")
	cursor, err := usersColl.Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to fetch users: %v", err)
	}
	defer cursor.Close(ctx)

	var users []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &users); err != nil {
		log.Fatalf("Failed to decode users: %v", err)
	}

	existingUserIDs := make([]primitive.ObjectID, len(users))
	for i, u := range users {
		existingUserIDs[i] = u.ID
	}

	fmt.Printf("Found %d active users.\n\n", len(existingUserIDs))
	fmt.Println("Scanning for ghost data from deleted users...")
	fmt.Println("==================================")

	// Helper: filter for documents whose user field is NOT in the existing set
	ghostFilter := func(field string) bson.M {
		return bson.M{field: bson.M{"$nin": existingUserIDs}}
	}

	type result struct {
		collection string
		deleted    int64
	}
	var results []result

	deleteMany := func(collName, field string) {
		coll := database.GetCollection(collName)
		res, err := coll.DeleteMany(ctx, ghostFilter(field))
		if err != nil {
			log.Printf("⚠️  Failed to clean %s (%s): %v", collName, field, err)
			return
		}
		results = append(results, result{collName, res.DeletedCount})
		fmt.Printf("🗑️  %-25s — deleted %d ghost records\n", collName, res.DeletedCount)
	}

	// ─────────────────────────────────────────────
	// 2. Content authored by deleted users
	// ─────────────────────────────────────────────
	deleteMany("posts", "author_id")
	deleteMany("stories", "author_id")
	deleteMany("comments", "user_id")
	deleteMany("likes", "user_id")

	// ─────────────────────────────────────────────
	// 3. Social graph
	// ─────────────────────────────────────────────
	deleteMany("follows", "follower_id")
	deleteMany("follows", "following_id")
	deleteMany("notifications", "user_id")
	deleteMany("notifications", "actor_id")

	// ─────────────────────────────────────────────
	// 4. Engagement / personalisation data
	// ─────────────────────────────────────────────
	deleteMany("saved_posts", "user_id")
	deleteMany("reports", "reporter_id")
	deleteMany("post_interactions", "user_id")
	deleteMany("activity", "user_id")

	// ─────────────────────────────────────────────
	// 5. Conversations where at least one participant is deleted
	// ─────────────────────────────────────────────
	convsColl := database.GetCollection("conversations")
	msgsColl := database.GetCollection("messages")

	// Find conversations that reference a non-existent participant
	ghostConvFilter := bson.M{
		"participants": bson.M{"$elemMatch": bson.M{"$nin": existingUserIDs}},
	}
	convCursor, err := convsColl.Find(ctx, ghostConvFilter)
	if err != nil {
		log.Printf("⚠️  Failed to scan conversations: %v", err)
	} else {
		defer convCursor.Close(ctx)
		var ghostConvIDs []primitive.ObjectID
		for convCursor.Next(ctx) {
			var c struct {
				ID primitive.ObjectID `bson:"_id"`
			}
			if convCursor.Decode(&c) == nil {
				ghostConvIDs = append(ghostConvIDs, c.ID)
			}
		}

		if len(ghostConvIDs) > 0 {
			// Delete their messages first
			msgRes, err := msgsColl.DeleteMany(ctx, bson.M{"conversation_id": bson.M{"$in": ghostConvIDs}})
			if err != nil {
				log.Printf("⚠️  Failed to delete ghost messages: %v", err)
			} else {
				fmt.Printf("🗑️  %-25s — deleted %d ghost records\n", "messages (in ghost convs)", msgRes.DeletedCount)
			}

			// Delete the ghost conversations
			convRes, err := convsColl.DeleteMany(ctx, bson.M{"_id": bson.M{"$in": ghostConvIDs}})
			if err != nil {
				log.Printf("⚠️  Failed to delete ghost conversations: %v", err)
			} else {
				fmt.Printf("🗑️  %-25s — deleted %d ghost records\n", "conversations", convRes.DeletedCount)
			}
		} else {
			fmt.Printf("🗑️  %-25s — deleted 0 ghost records\n", "conversations")
			fmt.Printf("🗑️  %-25s — deleted 0 ghost records\n", "messages (in ghost convs)")
		}
	}

	// Also clean messages sent BY deleted users (sender no longer exists)
	deleteMany("messages", "sender_id")

	// ─────────────────────────────────────────────
	// 6. Sessions left behind by deleted users
	// ─────────────────────────────────────────────
	deleteMany("sessions", "user_id")

	// ─────────────────────────────────────────────
	// Summary
	// ─────────────────────────────────────────────
	var totalDeleted int64
	for _, r := range results {
		totalDeleted += r.deleted
	}

	fmt.Println("\n==================================")
	fmt.Println("✅ Ghost Data Cleanup Completed!")
	fmt.Printf("Total ghost records deleted: %d\n", totalDeleted)
	fmt.Println("==================================")
}
