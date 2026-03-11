package main

import (
	"context"
	"fmt"

	"federated-social/backend/config"
	"federated-social/backend/database"

	contentRepo "federated-social/backend/epics/content-sharing/repository"
	identityRepo "federated-social/backend/epics/identity/repository"
	messagingRepo "federated-social/backend/epics/messaging/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	config.LoadConfig()
	database.Connect()

	dbNames := []string{"federated_social", "federated_social_server2"}

	ctx := context.Background()

	for _, dbName := range dbNames {
		fmt.Printf("=== Processing Database: %s ===\\n", dbName)

		// Override global DB pointer manually for scripts
		d := database.DB.Client().Database(dbName)
		database.DB = d

		// Reinitialize repos with the new DB context
		postRepo := contentRepo.NewPostRepository()
		storyRepo := contentRepo.NewStoryRepository()
		messageRepo := messagingRepo.NewMessageRepository()
		activityRepo := identityRepo.NewActivityRepository()
		sessionRepo := identityRepo.NewSessionRepository()
		followRepo := contentRepo.NewFollowRepository()
		notificationRepo := contentRepo.NewNotificationRepository()

		deletedUsersColl := database.GetCollection("deleted_users")
		cursor, err := deletedUsersColl.Find(ctx, bson.M{})
		if err != nil {
			fmt.Printf("Error finding deleted_users in %s: %v\\n", dbName, err)
			continue
		}

		var ghostIDs []primitive.ObjectID

		for cursor.Next(ctx) {
			var doc bson.M
			if err := cursor.Decode(&doc); err == nil {
				if uid, ok := doc["user_id"].(primitive.ObjectID); ok {
					ghostIDs = append(ghostIDs, uid)
				}
			}
		}

		fmt.Printf("Found %d ghost users to clean up in %s.\\n", len(ghostIDs), dbName)

		for _, oid := range ghostIDs {
			fmt.Printf("Cleaning up data for Ghost User ID: %s\\n", oid.Hex())

			_ = postRepo.DeletePostsByAuthor(ctx, oid)
			_ = postRepo.DeleteLikesByUser(ctx, oid)
			_ = postRepo.DeleteCommentsByUser(ctx, oid)
			_ = postRepo.DeleteSavedPostsByUser(ctx, oid)
			_ = postRepo.DeleteReportsByUser(ctx, oid)
			_ = postRepo.DeleteInteractionsByUser(ctx, oid)

			_ = storyRepo.DeleteStoriesByAuthor(ctx, oid)

			_ = messageRepo.DeleteConversationsByUser(ctx, oid)
			_ = messageRepo.DeleteMessagesByUser(ctx, oid)

			_ = followRepo.DeleteAllFollows(ctx, oid)

			_ = notificationRepo.DeleteUserNotifications(ctx, oid)

			_ = sessionRepo.InvalidateAllUserSessions(ctx, oid)
			_ = activityRepo.DeleteUserActivity(ctx, oid)

			// Additional aggressive cleanup on users collection itself in case it was a soft-delete
			database.GetCollection("users").DeleteOne(ctx, bson.M{"_id": oid})
		}
	}

	fmt.Println("Ghost data cleanup complete.")
}
