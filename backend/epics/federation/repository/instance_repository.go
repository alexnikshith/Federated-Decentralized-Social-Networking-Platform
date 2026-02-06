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

type InstanceRepository struct {
	instances *mongo.Collection
}

func NewInstanceRepository() *InstanceRepository {
	return &InstanceRepository{
		instances: database.GetCollection("instances"),
	}
}

// CreateIndexes creates necessary indexes for instances collection
func (r *InstanceRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "domain", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "trust_level", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "last_seen_at", Value: -1}},
		},
	}

	_, err := r.instances.Indexes().CreateMany(ctx, indexes)
	return err
}

// CreateInstance creates a new instance record
func (r *InstanceRepository) CreateInstance(ctx context.Context, instance *models.Instance) error {
	instance.CreatedAt = time.Now()
	instance.UpdatedAt = time.Now()
	result, err := r.instances.InsertOne(ctx, instance)
	if err != nil {
		return err
	}
	instance.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetInstanceByDomain retrieves an instance by domain
func (r *InstanceRepository) GetInstanceByDomain(ctx context.Context, domain string) (*models.Instance, error) {
	var instance models.Instance
	err := r.instances.FindOne(ctx, bson.M{"domain": domain}).Decode(&instance)
	if err != nil {
		return nil, err
	}
	return &instance, nil
}

// UpdateInstanceLastSeen updates the last seen timestamp for an instance
func (r *InstanceRepository) UpdateInstanceLastSeen(ctx context.Context, domain string) error {
	_, err := r.instances.UpdateOne(
		ctx,
		bson.M{"domain": domain},
		bson.M{
			"$set": bson.M{
				"last_seen_at": time.Now(),
				"updated_at":   time.Now(),
			},
		},
	)
	return err
}

// ListTrustedInstances returns all instances with "trusted" trust level
func (r *InstanceRepository) ListTrustedInstances(ctx context.Context) ([]models.Instance, error) {
	cursor, err := r.instances.Find(ctx, bson.M{"trust_level": "trusted"})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var instances []models.Instance
	if err := cursor.All(ctx, &instances); err != nil {
		return nil, err
	}
	return instances, nil
}

// UpdateTrustLevel updates the trust level of an instance
func (r *InstanceRepository) UpdateTrustLevel(ctx context.Context, domain, trustLevel string) error {
	_, err := r.instances.UpdateOne(
		ctx,
		bson.M{"domain": domain},
		bson.M{
			"$set": bson.M{
				"trust_level": trustLevel,
				"updated_at":  time.Now(),
			},
		},
	)
	return err
}

// UpsertInstance creates or updates an instance
func (r *InstanceRepository) UpsertInstance(ctx context.Context, instance *models.Instance) error {
	instance.UpdatedAt = time.Now()
	opts := options.Update().SetUpsert(true)

	update := bson.M{
		"$set": bson.M{
			"inbox_url":    instance.InboxURL,
			"trust_level":  instance.TrustLevel,
			"last_seen_at": instance.LastSeenAt,
			"updated_at":   instance.UpdatedAt,
		},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
		},
	}

	result, err := r.instances.UpdateOne(
		ctx,
		bson.M{"domain": instance.Domain},
		update,
		opts,
	)
	if err != nil {
		return err
	}

	// If upserted, get the ID
	if result.UpsertedID != nil {
		instance.ID = result.UpsertedID.(primitive.ObjectID)
	}

	return nil
}

// GetInstancesByTrustLevel retrieves all instances with a specific trust level
func (r *InstanceRepository) GetInstancesByTrustLevel(ctx context.Context, trustLevel string) ([]models.Instance, error) {
	filter := bson.M{"trust_level": trustLevel}

	cursor, err := r.instances.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var instances []models.Instance
	if err := cursor.All(ctx, &instances); err != nil {
		return nil, err
	}

	return instances, nil
}

// ListAllInstances returns all instances
func (r *InstanceRepository) ListAllInstances(ctx context.Context) ([]models.Instance, error) {
	cursor, err := r.instances.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var instances []models.Instance
	if err := cursor.All(ctx, &instances); err != nil {
		return nil, err
	}
	return instances, nil
}
