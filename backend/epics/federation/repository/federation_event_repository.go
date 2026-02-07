package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/federation/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type FederationEventRepository struct {
	events *mongo.Collection
}

func NewFederationEventRepository() *FederationEventRepository {
	return &FederationEventRepository{
		events: database.GetCollection("federation_events"),
	}
}

// CreateIndexes creates necessary indexes for federation_events collection
func (r *FederationEventRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "created_at", Value: -1}},
		},
		{
			Keys: bson.D{
				{Key: "target_instance", Value: 1},
				{Key: "status", Value: 1},
			},
		},
		{
			Keys: bson.D{{Key: "type", Value: 1}},
		},
	}

	_, err := r.events.Indexes().CreateMany(ctx, indexes)
	return err
}

// CreateEvent creates a new federation event
func (r *FederationEventRepository) CreateEvent(ctx context.Context, event *models.FederationEvent) error {
	event.CreatedAt = time.Now()
	event.UpdatedAt = time.Now()
	event.Status = "pending"
	event.RetryCount = 0

	result, err := r.events.InsertOne(ctx, event)
	if err != nil {
		return err
	}
	event.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetPendingEvents retrieves all pending federation events
func (r *FederationEventRepository) GetPendingEvents(ctx context.Context) ([]models.FederationEvent, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	cursor, err := r.events.Find(ctx, bson.M{"status": "pending"}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var events []models.FederationEvent
	if err := cursor.All(ctx, &events); err != nil {
		return nil, err
	}
	return events, nil
}

// GetFailedEvents retrieves all failed federation events with retry count less than max
func (r *FederationEventRepository) GetFailedEvents(ctx context.Context, maxRetries int) ([]models.FederationEvent, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	filter := bson.M{
		"status":      "failed",
		"retry_count": bson.M{"$lt": maxRetries},
	}

	cursor, err := r.events.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var events []models.FederationEvent
	if err := cursor.All(ctx, &events); err != nil {
		return nil, err
	}
	return events, nil
}

// MarkEventSent marks a federation event as sent
func (r *FederationEventRepository) MarkEventSent(ctx context.Context, eventID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.events.UpdateOne(
		ctx,
		bson.M{"_id": eventID},
		bson.M{
			"$set": bson.M{
				"status":       "sent",
				"last_attempt": now,
				"updated_at":   now,
			},
		},
	)
	return err
}

// MarkEventFailed marks a federation event as failed
func (r *FederationEventRepository) MarkEventFailed(ctx context.Context, eventID primitive.ObjectID, errorMessage string) error {
	now := time.Now()
	_, err := r.events.UpdateOne(
		ctx,
		bson.M{"_id": eventID},
		bson.M{
			"$set": bson.M{
				"status":        "failed",
				"last_attempt":  now,
				"error_message": errorMessage,
				"updated_at":    now,
			},
			"$inc": bson.M{
				"retry_count": 1,
			},
		},
	)
	return err
}

// IncrementRetryCount increments the retry count for a federation event
func (r *FederationEventRepository) IncrementRetryCount(ctx context.Context, eventID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.events.UpdateOne(
		ctx,
		bson.M{"_id": eventID},
		bson.M{
			"$inc": bson.M{
				"retry_count": 1,
			},
			"$set": bson.M{
				"updated_at": now,
			},
		},
	)
	return err
}

// ResetEventToPending resets a failed event back to pending for retry
func (r *FederationEventRepository) ResetEventToPending(ctx context.Context, eventID primitive.ObjectID) error {
	_, err := r.events.UpdateOne(
		ctx,
		bson.M{"_id": eventID},
		bson.M{
			"$set": bson.M{
				"status":     "pending",
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

// DeleteEvent deletes a federation event
func (r *FederationEventRepository) DeleteEvent(ctx context.Context, eventID primitive.ObjectID) error {
	_, err := r.events.DeleteOne(ctx, bson.M{"_id": eventID})
	return err
}

// GetEventByID retrieves a federation event by ID
func (r *FederationEventRepository) GetEventByID(ctx context.Context, eventID primitive.ObjectID) (*models.FederationEvent, error) {
	var event models.FederationEvent
	err := r.events.FindOne(ctx, bson.M{"_id": eventID}).Decode(&event)
	if err != nil {
		return nil, err
	}
	return &event, nil
}
