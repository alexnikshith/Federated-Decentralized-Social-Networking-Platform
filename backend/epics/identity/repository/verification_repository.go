package repository

import (
	"context"
	"errors"
	"federated-social/backend/database"
	"federated-social/backend/epics/identity/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type VerificationRepository struct {
	collection *mongo.Collection
}

func NewVerificationRepository() *VerificationRepository {
	return &VerificationRepository{
		collection: database.GetCollection("verification_codes"),
	}
}

func (r *VerificationRepository) CreateVerificationCode(ctx context.Context, code *models.VerificationCode) error {
	code.CreatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, code)
	return err
}

func (r *VerificationRepository) FindLatestByUserID(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error) {
	opts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	var code models.VerificationCode
	err := r.collection.FindOne(ctx, bson.M{"user_id": userID}, opts).Decode(&code)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("code not found")
		}
		return nil, err
	}
	return &code, nil
}

// DeleteVerificationCodesByUser permanently deletes all verification codes for a user
func (r *VerificationRepository) DeleteVerificationCodesByUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

// CreateIndexes creates necessary database indexes
func (r *VerificationRepository) CreateIndexes(ctx context.Context) error {
	// Index on ExpiresAt with 0 expireAfterSeconds means it expires at the time specified in ExpiresAt
	index := mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	}
	_, err := r.collection.Indexes().CreateOne(ctx, index)
	return err
}
