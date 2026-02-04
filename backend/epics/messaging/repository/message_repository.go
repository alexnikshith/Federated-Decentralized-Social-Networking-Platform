package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/messaging/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MessageRepository struct {
	messages      *mongo.Collection
	conversations *mongo.Collection
}

func NewMessageRepository() *MessageRepository {
	return &MessageRepository{
		messages:      database.GetCollection("messages"),
		conversations: database.GetCollection("conversations"),
	}
}

func (r *MessageRepository) CreateMessage(ctx context.Context, msg *models.Message) error {
	msg.CreatedAt = time.Now()
	msg.IsRead = false
	result, err := r.messages.InsertOne(ctx, msg)
	if err != nil {
		return err
	}
	msg.ID = result.InsertedID.(primitive.ObjectID)

	// Update conversation's last message and updated_at
	_, err = r.conversations.UpdateOne(
		ctx,
		bson.M{"_id": msg.ConversationID},
		bson.M{
			"$set": bson.M{
				"last_message": msg,
				"updated_at":   msg.CreatedAt,
			},
		},
	)
	return err
}

func (r *MessageRepository) GetConversation(ctx context.Context, participants []primitive.ObjectID) (*models.Conversation, error) {
	var conv models.Conversation
	filter := bson.M{
		"participants": bson.M{"$all": participants, "$size": len(participants)},
	}
	err := r.conversations.FindOne(ctx, filter).Decode(&conv)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Not found
		}
		return nil, err
	}
	return &conv, nil
}

func (r *MessageRepository) CreateConversation(ctx context.Context, participants []primitive.ObjectID) (*models.Conversation, error) {
	conv := &models.Conversation{
		Participants: participants,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	result, err := r.conversations.InsertOne(ctx, conv)
	if err != nil {
		return nil, err
	}
	conv.ID = result.InsertedID.(primitive.ObjectID)
	return conv, nil
}

func (r *MessageRepository) GetUserConversations(ctx context.Context, userID primitive.ObjectID) ([]models.Conversation, error) {
	filter := bson.M{"participants": userID}
	opts := options.Find().SetSort(bson.M{"updated_at": -1})
	cursor, err := r.conversations.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var conversations []models.Conversation
	if err = cursor.All(ctx, &conversations); err != nil {
		return nil, err
	}
	return conversations, nil
}

func (r *MessageRepository) GetConversationMessages(ctx context.Context, conversationID primitive.ObjectID, limit int64) ([]models.Message, error) {
	filter := bson.M{"conversation_id": conversationID}
	opts := options.Find().SetLimit(limit).SetSort(bson.M{"created_at": -1})
	cursor, err := r.messages.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messages []models.Message
	if err = cursor.All(ctx, &messages); err != nil {
		return nil, err
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

func (r *MessageRepository) CreateIndexes(ctx context.Context) error {
	_, err := r.conversations.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{primitive.E{Key: "participants", Value: 1}},
	})
	if err != nil {
		return err
	}
	_, err = r.messages.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{primitive.E{Key: "conversation_id", Value: 1}, primitive.E{Key: "created_at", Value: -1}},
	})
	return err
}
