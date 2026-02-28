package repository

import (
	"context"
	"errors"
	"federated-social/backend/database"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/safety/encryption"
	"log"
	"regexp"
	"strings"
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

// CreateUser persists a new user to the database
// It sets default timestamps and active status before insertion.
func (r *UserRepository) CreateUser(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.IsActive = true
	user.IsDeactivated = false
	if user.JoinedCommunities == nil {
		user.JoinedCommunities = []string{}
	}

	// Encrypt the email before storing
	encryptedEmail, err := encryption.Encrypt(strings.ToLower(user.Email))
	if err != nil {
		return err
	}
	originalEmail := user.Email
	user.Email = encryptedEmail

	result, err := r.collection.InsertOne(ctx, user)
	user.Email = originalEmail // Restore plaintext for the application

	if err != nil {
		return err
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByEmail finds a user by email (case-insensitive)
// It uses a regex case-insensitive search to ensure email uniqueness regardless of case.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	// Encrypt the incoming email to search exactly
	encryptedEmail, err := encryption.Encrypt(strings.ToLower(email))
	if err != nil {
		return nil, err
	}
	filter := bson.M{"email": encryptedEmail}

	err = r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Decrypt the email before returning
	if decrypted, err := encryption.Decrypt(user.Email); err == nil {
		user.Email = decrypted
	}
	return &user, nil
}

// FindByUsername finds a user by username (case-insensitive)
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	// Use case-insensitive regex for username lookup to ensure uniqueness across cases
	pattern := "^" + regexp.QuoteMeta(username) + "$"
	filter := bson.M{"username": primitive.Regex{Pattern: pattern, Options: "i"}}

	err := r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Decrypt the email before returning
	if user.Email != "" {
		if decrypted, err := encryption.Decrypt(user.Email); err == nil {
			user.Email = decrypted
		}
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

	// Decrypt the email before returning
	if user.Email != "" {
		if decrypted, err := encryption.Decrypt(user.Email); err == nil {
			user.Email = decrypted
		}
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

	// If error is related to type, we try to fix it
	if err != nil {
		// Attempt to fix: Set to empty array then retry
		r.collection.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{"$set": bson.M{"joined_communities": []string{}}})
		_, err = r.collection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	}

	return err
}

// RemoveJoinedCommunity removes a community ID from the user's joined list
func (r *UserRepository) RemoveJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	update := bson.M{
		"$pull": bson.M{"joined_communities": communityID},
		"$set":  bson.M{"updated_at": time.Now()},
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
	// Log the deletion so it can be used for traffic stats
	deletedUsersColl := database.GetCollection("deleted_users")
	deletedUsersColl.InsertOne(ctx, bson.M{
		"user_id":    userID,
		"deleted_at": time.Now(),
	})

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

	for i := range users {
		if users[i].Email != "" {
			if decrypted, err := encryption.Decrypt(users[i].Email); err == nil {
				users[i].Email = decrypted
			}
		}
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

	for i := range users {
		if users[i].Email != "" {
			if decrypted, err := encryption.Decrypt(users[i].Email); err == nil {
				users[i].Email = decrypted
			}
		}
	}

	return users, nil
}

// MigrateGlobalDiscovery sets IsDiscoverable to true for users who don't have the field set (legacy users)
func (r *UserRepository) MigrateGlobalDiscovery(ctx context.Context) error {
	// Only update users where the field does not exist
	filter := bson.M{"is_discoverable": bson.M{"$exists": false}}
	update := bson.M{"$set": bson.M{"is_discoverable": true}}

	result, err := r.collection.UpdateMany(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.ModifiedCount > 0 {
		log.Printf("Migration: Enabled global discovery for %d users", result.ModifiedCount)
	}
	return nil
}
