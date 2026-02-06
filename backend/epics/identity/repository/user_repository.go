package repository

import (
	"context"
	"errors"
	"federated-social/backend/database"
	"federated-social/backend/epics/identity/models"
	"log"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserRepository struct {
	collection *mongo.Collection
}

func NewUserRepository() *UserRepository {
	return &UserRepository{
		collection: database.GetCollection("users"),
	}
}

// CreateUser creates a new user in the database
func (r *UserRepository) CreateUser(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.IsActive = true
	user.IsDeactivated = false

	result, err := r.collection.InsertOne(ctx, user)
	if err != nil {
		return err
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByEmail finds a user by email (case-insensitive)
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	// Use case-insensitive regex for email lookup
	// We escape special characters to treat them literally, though for simple emails only . and + matter mostly
	pattern := "^" + regexp.QuoteMeta(email) + "$"
	filter := bson.M{"email": primitive.Regex{Pattern: pattern, Options: "i"}}

	err := r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// FindByUsername finds a user by username
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// FindByID finds a user by ID
func (r *UserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// UpdateUser updates user information
func (r *UserRepository) UpdateUser(ctx context.Context, userID primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": update},
	)
	if err == nil {
		log.Printf("DEBUG: UpdateUser for %s matched %d and modified %d docs", userID.Hex(), result.MatchedCount, result.ModifiedCount)
	}
	return err
}

// AddJoinedCommunity adds a community ID to the user's joined list
func (r *UserRepository) AddJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	update := bson.M{
		"$addToSet": bson.M{"joined_communities": communityID},
		"$set":      bson.M{"updated_at": time.Now()},
	}

	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	return err
}

// DeactivateUser soft deletes a user
func (r *UserRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	update := bson.M{
		"is_deactivated": true,
		"is_active":      false,
		"updated_at":     time.Now(),
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": update},
	)
	return err
}

// DeleteUser permanently deletes a user
func (r *UserRepository) DeleteUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": userID})
	return err
}

// FindByIDs finds multiple users by their IDs
func (r *UserRepository) FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]models.User, error) {
	if len(ids) == 0 {
		return []models.User{}, nil
	}

	filter := bson.M{"_id": bson.M{"$in": ids}}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	return users, nil
}

// CreateIndexes creates necessary database indexes
func (r *UserRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{bson.E{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{bson.E{Key: "username", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// Enable2FAForAll enables 2FA for all existing users (Migration)
func (r *UserRepository) Enable2FAForAll(ctx context.Context) error {
	// Set is_2fa_enabled = true for all users where it is not already true
	filter := bson.M{"is_2fa_enabled": bson.M{"$ne": true}}
	update := bson.M{"$set": bson.M{"is_2fa_enabled": true}}

	result, err := r.collection.UpdateMany(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.ModifiedCount > 0 {
		// Log migration result?
	}
	return nil
}

// CountAll returns the total number of users
func (r *UserRepository) CountAll(ctx context.Context) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{})
}

// FindAll returns all users
func (r *UserRepository) FindAll(ctx context.Context) ([]models.User, error) {
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}
