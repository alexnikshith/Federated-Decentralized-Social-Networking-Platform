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

// CreateMessage inserts a new message and updates the conversation
// A message creation automatically updates the 'last_message' and 'updated_at' fields
// of the parent conversation to keep the inbox view sorted and current.
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

func (r *MessageRepository) CreateConversation(ctx context.Context, participants []primitive.ObjectID, instances map[string]string, usernames map[string]string, displayNames map[string]string) (*models.Conversation, error) {
	conv := &models.Conversation{
		Participants:            participants,
		ParticipantInstances:    instances,
		ParticipantUsernames:    usernames,
		ParticipantDisplayNames: displayNames,
		CreatedAt:               time.Now(),
		UpdatedAt:               time.Now(),
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

func (r *MessageRepository) GetMessageByID(ctx context.Context, id primitive.ObjectID) (*models.Message, error) {
	var msg models.Message
	err := r.messages.FindOne(ctx, bson.M{"_id": id}).Decode(&msg)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *MessageRepository) DeleteMessage(ctx context.Context, messageID primitive.ObjectID) error {
	_, err := r.messages.DeleteOne(ctx, bson.M{"_id": messageID})
	return err
}

func (r *MessageRepository) DeleteConversation(ctx context.Context, conversationID primitive.ObjectID) error {
	// Delete all messages in the conversation
	_, err := r.messages.DeleteMany(ctx, bson.M{"conversation_id": conversationID})
	if err != nil {
		return err
	}
	// Delete the conversation itself
	_, err = r.conversations.DeleteOne(ctx, bson.M{"_id": conversationID})
	return err
}

func (r *MessageRepository) GetConversationByID(ctx context.Context, id primitive.ObjectID) (*models.Conversation, error) {
	var conv models.Conversation
	err := r.conversations.FindOne(ctx, bson.M{"_id": id}).Decode(&conv)
	if err != nil {
		return nil, err
	}
	return &conv, nil
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

func (r *MessageRepository) GetUnreadCountForConversation(ctx context.Context, conversationID primitive.ObjectID, userID primitive.ObjectID) (int64, error) {
	filter := bson.M{
		"conversation_id": conversationID,
		"sender_id":       bson.M{"$ne": userID},
		"is_read":         false,
	}
	return r.messages.CountDocuments(ctx, filter)
}

func (r *MessageRepository) GetTotalUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"participants": userID}}},
		// Lookup to get participant details
		{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "participants",
			"foreignField": "_id",
			"as":           "participant_details",
		}}},
		// Filter out conversations where any participant (other than current user) is deactivated or deleted
		{{Key: "$addFields", Value: bson.M{
			"has_deactivated_other": bson.M{
				"$anyElementTrue": bson.A{
					bson.M{
						"$map": bson.M{
							"input": "$participant_details",
							"as":    "p",
							"in": bson.M{
								"$and": bson.A{
									bson.M{"$ne": bson.A{"$$p._id", userID}},
									bson.M{
										"$or": bson.A{
											bson.M{"$eq": bson.A{"$$p.is_deactivated", true}},
											bson.M{"$eq": bson.A{"$$p.is_active", false}},
										},
									},
								},
							},
						},
					},
				},
			},
		}}},
		{{Key: "$match", Value: bson.M{"has_deactivated_other": bson.M{"$ne": true}}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "messages",
			"localField":   "_id",
			"foreignField": "conversation_id",
			"as":           "messages",
		}}},
		{{Key: "$unwind", Value: "$messages"}},
		{{Key: "$match", Value: bson.M{
			"messages.sender_id": bson.M{"$ne": userID},
			"messages.is_read":   false,
		}}},
		{{Key: "$count", Value: "total_unread"}},
	}

	cursor, err := r.conversations.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err = cursor.All(ctx, &result); err != nil {
		return 0, err
	}

	if len(result) > 0 {
		return int64(result[0]["total_unread"].(int32)), nil
	}
	return 0, nil
}

// MarkConversationAsRead marks all messages in a conversation as read for a specific user
func (r *MessageRepository) MarkConversationAsRead(ctx context.Context, conversationID primitive.ObjectID, userID primitive.ObjectID) error {
	filter := bson.M{
		"conversation_id": conversationID,
		"sender_id":       bson.M{"$ne": userID}, // Only mark messages from others as read
		"is_read":         false,
	}
	update := bson.M{
		"$set": bson.M{"is_read": true},
	}
	_, err := r.messages.UpdateMany(ctx, filter, update)
	return err
}

// DeleteMessagesByUser deletes all messages sent by a specific user
func (r *MessageRepository) DeleteMessagesByUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.messages.DeleteMany(ctx, bson.M{"sender_id": userID})
	return err
}

// DeleteConversationsByUser deletes all conversations a user participates in,
// along with all messages within those conversations.
func (r *MessageRepository) DeleteConversationsByUser(ctx context.Context, userID primitive.ObjectID) error {
	// 1. Find all conversation IDs where userID is a participant
	cursor, err := r.conversations.Find(ctx, bson.M{"participants": userID})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var convIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var conv struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if cursor.Decode(&conv) == nil {
			convIDs = append(convIDs, conv.ID)
		}
	}

	if len(convIDs) == 0 {
		return nil
	}

	// 2. Delete all messages in those conversations
	_, err = r.messages.DeleteMany(ctx, bson.M{"conversation_id": bson.M{"$in": convIDs}})
	if err != nil {
		return err
	}

	// 3. Delete the conversations themselves
	_, err = r.conversations.DeleteMany(ctx, bson.M{"_id": bson.M{"$in": convIDs}})
	return err
}
