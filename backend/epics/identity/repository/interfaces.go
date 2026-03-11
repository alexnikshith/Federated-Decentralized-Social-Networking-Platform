package repository

import (
	"context"
	"federated-social/backend/epics/identity/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRepositoryInterface interface {
	CreateUser(ctx context.Context, user *models.User) error
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByUsername(ctx context.Context, username string) (*models.User, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	UpdateUser(ctx context.Context, userID primitive.ObjectID, update bson.M) error
	AddJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error
	RemoveJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error
	DeactivateUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteUser(ctx context.Context, userID primitive.ObjectID) error
	FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]models.User, error)
	CreateIndexes(ctx context.Context) error
	Enable2FAForAll(ctx context.Context) error
	CountAll(ctx context.Context) (int64, error)
	FindAll(ctx context.Context) ([]models.User, error)
	MigrateGlobalDiscovery(ctx context.Context) error
}

type SessionRepositoryInterface interface {
	CreateSession(ctx context.Context, session *models.Session) error
	FindSessionByToken(ctx context.Context, token string) (*models.Session, error)
	InvalidateSession(ctx context.Context, token string) error
	InvalidateAllUserSessions(ctx context.Context, userID primitive.ObjectID) error
	DeleteAllUserSessions(ctx context.Context, userID primitive.ObjectID) error
	CleanupExpiredSessions(ctx context.Context) error
	CreateIndexes(ctx context.Context) error
}

type ActivityRepositoryInterface interface {
	LogActivity(ctx context.Context, log *models.ActivityLog) error
	GetUserActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error)
	DeleteUserActivity(ctx context.Context, userID primitive.ObjectID) error
	CountDailyActivity(ctx context.Context) (int64, error)
	CreateIndexes(ctx context.Context) error
}

type VerificationRepositoryInterface interface {
	CreateVerificationCode(ctx context.Context, code *models.VerificationCode) error
	FindLatestByUserID(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error)
	DeleteVerificationCodesByUser(ctx context.Context, userID primitive.ObjectID) error
	CreateIndexes(ctx context.Context) error
}
