package repository

import (
	"context"
	"federated-social/backend/database"
	identityModels "federated-social/backend/epics/identity/models"
	"regexp"
	"strings"

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

// SearchUsers searches for users by username, display name, email, or bio
func (r *SearchRepository) SearchUsers(ctx context.Context, query string, limit int64) ([]identityModels.User, error) {
	// Clean and tokenize query
	query = strings.TrimSpace(query)
	if query == "" {
		return []identityModels.User{}, nil
	}

	// Split by space and clean tokens
	rawWords := strings.Fields(query)
	var filters []bson.M

	for _, word := range rawWords {
		// Clean the word
		word = strings.TrimLeft(word, "@")
		if word == "" {
			continue
		}

		// Escape word for regex
		escapedWord := regexp.QuoteMeta(word)

		// Each word must match at least one of these fields
		// Each word must match the username
		filters = append(filters, bson.M{
			"username": bson.M{"$regex": escapedWord, "$options": "i"},
		})
	}

	if len(filters) == 0 {
		return []identityModels.User{}, nil
	}

	// Final filter: All words must match (AND of ORs)
	// AND we must respect account status (active and not deactivated)
	var finalFilter bson.M

	statusFilter := bson.M{
		"is_active":      true,
		"is_deactivated": false,
	}

	if len(filters) == 1 {
		// Combine the single text filter with status filter
		finalFilter = bson.M{
			"$and": []bson.M{filters[0], statusFilter},
		}
	} else {
		// Combine all text filters (ANDed together) with status filter
		allFilters := append(filters, statusFilter)
		finalFilter = bson.M{"$and": allFilters}
	}

	opts := options.Find().SetLimit(limit).SetSort(bson.D{{Key: "username", Value: 1}})

	cursor, err := r.collection.Find(ctx, finalFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []identityModels.User
	// Using a more flexible slice to avoid decoding errors if possible
	if err = cursor.All(ctx, &users); err != nil {
		// If decoding into the struct fails (e.g. because of timestamps),
		// we should still try to return what we can or at least not fail everything.
		return nil, err
	}

	if users == nil {
		return []identityModels.User{}, nil
	}

	// Filter out sensitive accounts if any (like pure admin accounts if needed)
	// For now, we return all matches, but you could add logic here.

	// Create a new slice to hold filtered users
	var filteredUsers []identityModels.User
	for _, user := range users {
		// Example: Skip users with "admin" in their username if strictly desired,
		// though typically search should just return matches.
		// If user wants strict matching logic, we can refine the query above.
		// For now, let's keep the exact matches.
		filteredUsers = append(filteredUsers, user)
	}

	return filteredUsers, nil
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
