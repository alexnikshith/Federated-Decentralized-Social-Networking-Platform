package integration

import (
	"context"
	contentDto "federated-social/backend/epics/content-sharing/dto"
	contentService "federated-social/backend/epics/content-sharing/service"
	identityDto "federated-social/backend/epics/identity/dto"
	identityRepo "federated-social/backend/epics/identity/repository"
	identityService "federated-social/backend/epics/identity/service"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestStoriesAndNotifications_Integration(t *testing.T) {
	ctx := context.Background()

	// --- Setup Services ---
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)

	sService := contentService.NewStoryService()
	nService := contentService.NewNotificationService()
	pService := contentService.NewPostService()
	fService := contentService.NewFollowService()

	// --- Step 1: Create two Users (Author and Reactor) ---
	author, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "story_author",
		Email:    "author@stories.com",
		Password: "SecurePassword123!",
	})
	reactor, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "story_reactor",
		Email:    "reactor@stories.com",
		Password: "SecurePassword123!",
	})

	// --- Step 2: Test Story Creation ---
	storyResp, err := sService.CreateStory(ctx, author.ID, contentDto.CreateStoryRequest{
		MediaURL:  "https://example.com/story.jpg",
		MediaType: "image",
		Content:   "My first story!",
	})
	assert.NoError(t, err)
	assert.NotNil(t, storyResp)
	storyID, _ := primitive.ObjectIDFromHex(storyResp.ID)

	// --- Step 3: Test Story Liking & Notification ---
	err = sService.LikeStory(ctx, storyID, reactor.ID)
	assert.NoError(t, err)

	// Verify Notification for Author
	notifs, err := nService.GetNotifications(ctx, author.ID, 10)
	assert.NoError(t, err)
	assert.NotEmpty(t, notifs)
	assert.Equal(t, "story_like", notifs[0].Type)
	assert.Equal(t, reactor.ID, notifs[0].RelatedUserID)

	// --- Step 4: Test Story Viewing ---
	err = sService.MarkStoryViewed(ctx, storyID, reactor.ID)
	assert.NoError(t, err)

	viewedIDs, err := sService.GetViewedStoryIDs(ctx, reactor.ID)
	assert.NoError(t, err)
	assert.Contains(t, viewedIDs, storyResp.ID)

	// --- Step 5: Test Mentions & Notifications ---
	// Reactor creates a post mentioning the Author
	mentionPost, err := pService.CreatePost(ctx, reactor.ID, contentDto.CreatePostRequest{
		Content: "Hey @story_author, check this out!",
	})
	assert.NoError(t, err)
	assert.NotNil(t, mentionPost)

	// Verify Mention Notification for Author
	notifs, _ = nService.GetNotifications(ctx, author.ID, 10)
	// The most recent notification should be the mention
	foundMention := false
	for _, n := range notifs {
		if n.Type == "mention" {
			foundMention = true
			assert.Equal(t, reactor.ID, n.RelatedUserID)
		}
	}
	assert.True(t, foundMention, "Author should receive a mention notification")

	// --- Step 6: Test Follow & Notification ---
	err = fService.Follow(ctx, reactor.ID, author.ID)
	assert.NoError(t, err)

	// Verify Follow Notification for Author
	notifs, _ = nService.GetNotifications(ctx, author.ID, 10)
	foundFollow := false
	for _, n := range notifs {
		if n.Type == "follow" {
			foundFollow = true
			assert.Equal(t, reactor.ID, n.RelatedUserID)
		}
	}
	assert.True(t, foundFollow, "Author should receive a follow notification")

	// --- Step 7: Test Unread Count ---
	unread, err := nService.GetUnreadCount(ctx, author.ID)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, unread, int64(3)) // story_like, mention, follow

	// Mark all as read
	err = nService.MarkAllAsRead(ctx, author.ID)
	assert.NoError(t, err)

	unread, _ = nService.GetUnreadCount(ctx, author.ID)
	assert.Equal(t, int64(0), unread)

	// --- Step 8: Story Deletion ---
	err = sService.DeleteStory(ctx, storyID, author.ID)
	assert.NoError(t, err)

	activeStories, _ := sService.GetActiveStories(ctx)
	for _, s := range activeStories {
		assert.NotEqual(t, storyResp.ID, s.ID)
	}
}
