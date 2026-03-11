package service

import (
	"context"
	federationModels "federated-social/backend/epics/federation/models"
	"federated-social/backend/epics/identity/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByUsername(ctx context.Context, username string) (*models.User, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	UpdateUser(ctx context.Context, userID primitive.ObjectID, update bson.M) error
	AddJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error
	RemoveJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error
	DeactivateUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteUser(ctx context.Context, userID primitive.ObjectID) error
}

// SessionRepository defines the interface for session data access
type SessionRepository interface {
	CreateSession(ctx context.Context, session *models.Session) error
	FindSessionByToken(ctx context.Context, token string) (*models.Session, error)
	InvalidateSession(ctx context.Context, token string) error
	InvalidateAllUserSessions(ctx context.Context, userID primitive.ObjectID) error
	DeleteAllUserSessions(ctx context.Context, userID primitive.ObjectID) error
}

// ActivityRepository defines the interface for activity logging
type ActivityRepository interface {
	LogActivity(ctx context.Context, log *models.ActivityLog) error
	GetUserActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error)
	DeleteUserActivity(ctx context.Context, userID primitive.ObjectID) error
}

// VerificationRepository defines the interface for OTP/Verification codes
type VerificationRepository interface {
	CreateVerificationCode(ctx context.Context, code *models.VerificationCode) error
	FindLatestByUserID(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error)
	DeleteVerificationCodesByUser(ctx context.Context, userID primitive.ObjectID) error
}

// EmailSender defines the interface for sending emails
type EmailSender interface {
	SendVerificationEmail(to string, code string) error
	SendPasswordResetEmail(to string, code string) error
}

// FollowRepository defines the interface for follow data access (from content-sharing epic)
type FollowRepository interface {
	CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error)
	CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error)
	DeleteAllFollows(ctx context.Context, userID primitive.ObjectID) error
}

// PostRepository defines the interface for post data access (from content-sharing epic)
type PostRepository interface {
	CountPostsByAuthor(ctx context.Context, userID primitive.ObjectID) (int64, error)
	DeletePostsByAuthor(ctx context.Context, userID primitive.ObjectID) error
	DeleteLikesByUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteCommentsByUser(ctx context.Context, userID primitive.ObjectID) error
}

// NotificationRepository defines the interface for notifications (from content-sharing epic)
type NotificationRepository interface {
	DeleteUserNotifications(ctx context.Context, userID primitive.ObjectID) error
}

// RemoteUserRepository defines the interface for remote users (from federation epic)
type RemoteUserRepository interface {
	GetRemoteUserByID(ctx context.Context, userID primitive.ObjectID) (*federationModels.RemoteUser, error)
	GetRemoteUserByActorID(ctx context.Context, actorID string) (*federationModels.RemoteUser, error)
	GetRemoteUserByUsername(ctx context.Context, username string) (*federationModels.RemoteUser, error)
	GetRemoteUserByUsernameAndInstance(ctx context.Context, username, instance string) (*federationModels.RemoteUser, error)
}

// FollowService defines the interface for high-level follow operations
type FollowService interface {
	IsFollowing(ctx context.Context, followerID, followedID primitive.ObjectID) (bool, error)
	CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error)
	CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error)
}
