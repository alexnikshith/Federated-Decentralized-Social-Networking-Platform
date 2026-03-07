package integration

import (
	"context"
	"federated-social/backend/epics/federation/repository"
	"federated-social/backend/epics/federation/service"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestFederation_Integration(t *testing.T) {
	ctx := context.Background()
	fedService := service.NewFederationService()

	// --- Scenario: Remote Server sends a Follow request to us ---
	// We simulate the processing of an incoming ActivityPub Follow activity
	remoteActorID := "https://external-server.com/users/bob"

	// Use a real ObjectID for the local user
	localUserID, _ := primitive.ObjectIDFromHex("60d5ecb8b3916d352c8b4567")

	err := fedService.StoreRemoteFollower(ctx, localUserID, remoteActorID, "bob", "external-server.com")
	assert.NoError(t, err)

	// Verify Remote Follower is in DB
	relRepo := repository.NewRemoteRelationshipsRepository()
	followers, err := relRepo.GetRemoteFollowers(ctx, localUserID)
	assert.NoError(t, err)
	assert.NotEmpty(t, followers)
	assert.Equal(t, remoteActorID, followers[0].RemoteActorID)

	// --- Scenario: Receiving a Remote Post (Inbox simulation) ---
	remotePostID := "https://external-server.com/posts/999"
	remoteContent := "Hello from the decentralized world!"

	err = fedService.StoreRemotePost(ctx, remotePostID, remoteActorID, "bob", "external-server.com", remoteContent, time.Now())
	assert.NoError(t, err)

	// Verify Remote Post is in DB
	postRepo := repository.NewRemotePostRepository()
	posts, err := postRepo.GetRemotePostsByAuthors(ctx, []string{remoteActorID}, 10)
	assert.NoError(t, err)
	assert.Len(t, posts, 1)
	assert.Equal(t, remoteContent, posts[0].Content)
}
