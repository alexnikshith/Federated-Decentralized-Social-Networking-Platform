package integration

import (
	"context"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	contentService "federated-social/backend/epics/content-sharing/service"
	identityDto "federated-social/backend/epics/identity/dto"
	identityRepo "federated-social/backend/epics/identity/repository"
	identityService "federated-social/backend/epics/identity/service"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSearch_Integration(t *testing.T) {
	ctx := context.Background()
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)

	// --- Step 1: Create Users with searchable names ---
	user1, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username:       "apple_user",
		DisplayName:    "Apple Fan",
		Email:          "apple@test.com",
		Password:       "TestPass123!",
		IsDiscoverable: true,
	})
	user2, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username:       "banana_user",
		DisplayName:    "Banana Split",
		Email:          "banana@test.com",
		Password:       "TestPass123!",
		IsDiscoverable: true,
	})
	user3, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username:       "pineapple_user",
		DisplayName:    "Tropical Pine",
		Email:          "pine@test.com",
		Password:       "TestPass123!",
		IsDiscoverable: true,
	})

	searchService := contentService.NewSearchService()

	// --- Step 2: Search for "apple" ---
	// Should return apple_user and pineapple_user
	_ = user3 // Ensure used
	results, err := searchService.SearchUsers(ctx, "apple", 10, nil)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, len(results), 2)

	foundApple := false
	foundPine := false
	for _, u := range results {
		if u.Username == "apple_user" {
			foundApple = true
		}
		if u.Username == "pineapple_user" {
			foundPine = true
		}
	}
	assert.True(t, foundApple)
	assert.True(t, foundPine)

	// --- Step 3: Test Prioritization (Follow banana and search for 'a') ---
	// User 1 follows User 2 (banana)
	followRepo := contentRepo.NewFollowRepository()
	_ = followRepo.Follow(ctx, user1.ID, user2.ID)

	// Search for 'a' as user 1. 'banana_user' specifically has 'a' and is followed.
	results, err = searchService.SearchUsers(ctx, "banana", 10, &user1.ID)
	assert.NoError(t, err)
	assert.NotEmpty(t, results)
	assert.True(t, results[0].IsFollowing)
	assert.Equal(t, "banana_user", results[0].Username)
}

func TestCommunity_Integration(t *testing.T) {
	ctx := context.Background()
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)

	user, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "comm_tester",
		Email:    "comm@test.com",
		Password: "TestPass123!",
	})

	profileService := identityService.NewProfileService()

	// --- Step 1: Join a Community ---
	commID := "community-magic-123"
	err := profileService.AddJoinedCommunity(ctx, user.ID, commID)
	assert.NoError(t, err)

	// --- Step 2: Verify Community is in Profile ---
	uRepo := identityRepo.NewUserRepository()
	dbUser, _ := uRepo.FindByID(ctx, user.ID)

	found := false
	for _, id := range dbUser.JoinedCommunities {
		if id == commID {
			found = true
			break
		}
	}
	assert.True(t, found, "Community should be in joined list")

	// --- Step 3: Leave Community ---
	err = profileService.RemoveJoinedCommunity(ctx, user.ID, commID)
	assert.NoError(t, err)

	// Verify removal
	dbUser, _ = uRepo.FindByID(ctx, user.ID)
	found = false
	for _, id := range dbUser.JoinedCommunities {
		if id == commID {
			found = true
			break
		}
	}
	assert.False(t, found, "Community should be removed from joined list")
}
