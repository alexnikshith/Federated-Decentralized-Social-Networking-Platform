package service

import (
	"context"
	"federated-social/backend/epics/federation/models"
	identityModels "federated-social/backend/epics/identity/models"
	"net/http"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// InstanceRepositoryInterface defines methods for interacting with instance data
type InstanceRepositoryInterface interface {
	GetInstanceByDomain(ctx context.Context, domain string) (*models.Instance, error)
	UpsertInstance(ctx context.Context, instance *models.Instance) error
	GetInstancesByTrustLevel(ctx context.Context, trustLevel string) ([]models.Instance, error)
	UpdateInstanceLastSeen(ctx context.Context, domain string) error
}

// RemoteUserRepositoryInterface defines methods for interacting with remote user data
type RemoteUserRepositoryInterface interface {
	UpsertRemoteUser(ctx context.Context, remoteUser *models.RemoteUser) error
	GetRemoteUsersByActorIDs(ctx context.Context, actorIDs []string) (map[string]*models.RemoteUser, error)
	GetRemoteUserByID(ctx context.Context, id primitive.ObjectID) (*models.RemoteUser, error)
}

// RemotePostRepositoryInterface defines methods for interacting with remote post data
type RemotePostRepositoryInterface interface {
	UpsertRemotePost(ctx context.Context, remotePost *models.RemotePost) error
	DeleteRemotePost(ctx context.Context, remotePostID string) error
	DeleteRemotePostByLocalID(ctx context.Context, id primitive.ObjectID) error
	GetRemotePostsByAuthors(ctx context.Context, actorIDs []string, limit int64) ([]models.RemotePost, error)
	GetRemotePostByObjectID(ctx context.Context, id primitive.ObjectID) (*models.RemotePost, error)
	IncrementLikeCount(ctx context.Context, remotePostID string) error
	DecrementLikeCount(ctx context.Context, remotePostID string) error
}

// FederationEventRepositoryInterface defines methods for interacting with federation events
type FederationEventRepositoryInterface interface {
	CreateEvent(ctx context.Context, event *models.FederationEvent) error
	GetPendingEvents(ctx context.Context) ([]models.FederationEvent, error)
	GetFailedEvents(ctx context.Context, maxRetries int) ([]models.FederationEvent, error)
	MarkEventSent(ctx context.Context, eventID primitive.ObjectID) error
	MarkEventFailed(ctx context.Context, eventID primitive.ObjectID, errorMessage string) error
}

// RemoteRelationshipsRepositoryInterface defines methods for interacting with remote relationships
type RemoteRelationshipsRepositoryInterface interface {
	AddRemoteFollower(ctx context.Context, follower *models.RemoteFollower) error
	AddRemoteFollow(ctx context.Context, follow *models.RemoteFollow) error
	RemoveRemoteFollow(ctx context.Context, localUserID primitive.ObjectID, remoteActorID, username, instance string) error
	GetFollowerInstances(ctx context.Context, userID primitive.ObjectID) ([]string, error)
	GetRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollow, error)
	GetRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollower, error)
	GetAcceptedFollowers(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollower, error)
	RemoveRemoteFollowerByActorID(ctx context.Context, remoteActorID string) error
	UpdateRemoteFollowStatus(ctx context.Context, remoteActorID, status string) error
	CountRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) (int64, error)
	CountRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) (int64, error)
}

// UserRepositoryInterface defines methods for interacting with user data (from identity epic)
type UserRepositoryInterface interface {
	FindByUsername(ctx context.Context, username string) (*identityModels.User, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*identityModels.User, error)
	EnsureKeyPair(ctx context.Context, userID primitive.ObjectID) (*identityModels.User, error)
}

// HTTPClientInterface defines methods for making HTTP requests
type HTTPClientInterface interface {
	Get(url string) (resp *http.Response, err error)
	Do(req *http.Request) (*http.Response, error)
}
