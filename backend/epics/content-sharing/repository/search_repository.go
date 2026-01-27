package repository

import (
	"context"
	"federated-social/backend/database"
	identityModels "federated-social/backend/epics/identity/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type SearchRepository struct {
	collection *mongo.Collection
}

func NewSearchRepository() *SearchRepository {
	return &SearchRepository{
		collection: database.GetCollection("users"),
	}
}

// CreateIndexes creates text index for username search
func (r *SearchRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "username", Value: "text"},
				{Key: "display_name", Value: "text"},
			},
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// SearchUsers searches for users by username
func (r *SearchRepository) SearchUsers(ctx context.Context, query string, limit int64) ([]identityModels.User, error) {
	// Use regex for partial matching
	filter := bson.M{
		"$or": []bson.M{
			{"username": bson.M{"$regex": query, "$options": "i"}},
			{"display_name": bson.M{"$regex": query, "$options": "i"}},
		},
		"is_active":      true,
		"is_deactivated": false,
	}

	opts := options.Find().SetLimit(limit)

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []identityModels.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	return users, nil
}

// GetUserByID retrieves a user by ID
func (r *SearchRepository) GetUserByID(ctx context.Context, userID primitive.ObjectID) (*identityModels.User, error) {
	var user identityModels.User
	err := r.collection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUsersByIDs retrieves multiple users by their IDs
func (r *SearchRepository) GetUsersByIDs(ctx context.Context, userIDs []primitive.ObjectID) (map[primitive.ObjectID]*identityModels.User, error) {
	filter := bson.M{"_id": bson.M{"$in": userIDs}}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []identityModels.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	// Convert to map for easy lookup
	userMap := make(map[primitive.ObjectID]*identityModels.User)
	for i := range users {
		userMap[users[i].ID] = &users[i]
	}

	return userMap, nil
}
