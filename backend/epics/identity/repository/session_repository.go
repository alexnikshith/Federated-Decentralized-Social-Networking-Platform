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
)

type SessionRepository struct {
	collection *mongo.Collection
}

func NewSessionRepository() *SessionRepository {
	return &SessionRepository{
		collection: database.GetCollection("sessions"),
	}
}

// CreateSession creates a new session
func (r *SessionRepository) CreateSession(ctx context.Context, session *models.Session) error {
	session.CreatedAt = time.Now()
	session.IsValid = true

	result, err := r.collection.InsertOne(ctx, session)
	if err != nil {
		return err
	}

	session.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindSessionByToken finds a session by token
func (r *SessionRepository) FindSessionByToken(ctx context.Context, token string) (*models.Session, error) {
	var session models.Session
	err := r.collection.FindOne(ctx, bson.M{
		"token":    token,
		"is_valid": true,
	}).Decode(&session)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("session not found")
		}
		return nil, err
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		return nil, errors.New("session expired")
	}

	return &session, nil
}

// InvalidateSession invalidates a session (logout)
func (r *SessionRepository) InvalidateSession(ctx context.Context, token string) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"token": token},
		bson.M{"$set": bson.M{"is_valid": false}},
	)
	return err
}

// InvalidateAllUserSessions invalidates all sessions for a user
func (r *SessionRepository) InvalidateAllUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateMany(
		ctx,
		bson.M{"user_id": userID},
		bson.M{"$set": bson.M{"is_valid": false}},
	)
	return err
}

// CleanupExpiredSessions removes expired sessions
func (r *SessionRepository) CleanupExpiredSessions(ctx context.Context) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{
		"expires_at": bson.M{"$lt": time.Now()},
	})
	return err
}
