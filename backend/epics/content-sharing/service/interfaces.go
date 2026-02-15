package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/models"
	federationModels "federated-social/backend/epics/federation/models"
	identityModels "federated-social/backend/epics/identity/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FollowRepository interface {
	Follow(ctx context.Context, followerID, followingID primitive.ObjectID) error
	Unfollow(ctx context.Context, followerID, followingID primitive.ObjectID) error
	IsFollowing(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error)
	GetFollowingIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error)
	GetFollowerIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error)
	CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error)
	CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error)
}

type UserRepository interface {
	FindByID(ctx context.Context, id primitive.ObjectID) (*identityModels.User, error)
	FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]identityModels.User, error)
}

type NotificationRepository interface {
	CreateNotification(ctx context.Context, notification *models.Notification) error
}

type BlockService interface {
	IsBlocked(ctx context.Context, blockerID, blockedID primitive.ObjectID) (bool, error)
}

type FederationService interface {
	GetRemoteFollowers(ctx context.Context, userID primitive.ObjectID) ([]federationModels.RemoteFollower, error)
	GetRemoteFollowing(ctx context.Context, userID primitive.ObjectID) ([]federationModels.RemoteFollow, error)
	FollowRemoteUser(ctx context.Context, followerID primitive.ObjectID, remoteUser *federationModels.RemoteUser) error
	UnfollowRemoteUser(ctx context.Context, followerID primitive.ObjectID, remoteUser *federationModels.RemoteUser) error
	IsRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID, remoteActorID string) (bool, error)
	CountRemoteFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error)
	CountRemoteFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error)
}

type RemoteUserRepository interface {
	GetRemoteUserByID(ctx context.Context, id primitive.ObjectID) (*federationModels.RemoteUser, error)
	GetRemoteUserByActorID(ctx context.Context, actorID string) (*federationModels.RemoteUser, error)
}
