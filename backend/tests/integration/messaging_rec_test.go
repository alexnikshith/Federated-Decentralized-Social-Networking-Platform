package integration

import (
	"context"
	contentDto "federated-social/backend/epics/content-sharing/dto"
	contentService "federated-social/backend/epics/content-sharing/service"
	identityDto "federated-social/backend/epics/identity/dto"
	identityRepo "federated-social/backend/epics/identity/repository"
	identityService "federated-social/backend/epics/identity/service"
	msgDto "federated-social/backend/epics/messaging/dto"
	msgService "federated-social/backend/epics/messaging/service"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestMessagingFlow_Integration(t *testing.T) {
	ctx := context.Background()

	// --- Step 1: Create two Users ---
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)

	user1, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "msg_tester1",
		Email:    "msg1@tester.com",
		Password: "SecurePassword123!",
	})
	user2, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "msg_tester2",
		Email:    "msg2@tester.com",
		Password: "SecurePassword123!",
	})

	// --- Step 2: Initialize Messaging Service ---
	mService := msgService.NewMessageService()

	// --- Step 3: Send a Message ---
	sendReq := msgDto.SendMessageRequest{
		ReceiverID: user2.ID.Hex(),
		Content:    "Hello User 2! This is an integration test message.",
		Type:       "text",
	}

	msg, err := mService.SendMessage(ctx, user1.ID, sendReq)
	assert.NoError(t, err)
	assert.NotNil(t, msg)
	assert.Equal(t, user1.ID, msg.SenderID)

	// --- Step 4: Verify Conversation and Message in DB ---
	convs, err := mService.GetConversations(ctx, user2.ID)
	assert.NoError(t, err)
	assert.NotEmpty(t, convs)
	assert.Equal(t, 1, convs[0].UnreadCount)
	assert.Equal(t, "Hello User 2! This is an integration test message.", convs[0].LastMessage.Content)

	// --- Step 5: Mark as Read ---
	convID, _ := primitive.ObjectIDFromHex(convs[0].ID)
	err = mService.MarkConversationAsRead(ctx, convID, user2.ID)
	assert.NoError(t, err)

	// Check unread count again
	unreadCount, _ := mService.GetTotalUnreadCount(ctx, user2.ID)
	assert.Equal(t, int64(0), unreadCount)
}

func TestRecommendations_Integration(t *testing.T) {
	ctx := context.Background()

	// --- Step 1: Setup User and Posts with keywords ---
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)
	user, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "rec_tester",
		Email:    "rec@tester.com",
		Password: "SecurePassword123!",
	})

	pService := contentService.NewPostService(nil)

	// Create posts about different topics
	_, _ = pService.CreatePost(ctx, user.ID, contentDto.CreatePostRequest{Content: "I like Docker"})
	time.Sleep(10 * time.Millisecond)
	pService.CreatePost(ctx, user.ID, contentDto.CreatePostRequest{Content: "Cooking pasta is my favorite hobby"})
	time.Sleep(10 * time.Millisecond)
	p3, _ := pService.CreatePost(ctx, user.ID, contentDto.CreatePostRequest{Content: "Golang is better than Python for high-concurrency backend development"})

	// --- Step 2: Simulate User Interest ---
	// Build interest in "Golang" and "backend" (matching p3)
	interestPost, _ := pService.CreatePost(ctx, user.ID, contentDto.CreatePostRequest{Content: "Golang backend masterclass"})
	err := pService.LikePost(ctx, interestPost.ID, user.ID)
	assert.NoError(t, err)

	// --- Step 3: Verify Recommendation Logic ---
	// The RecommenderService should now rank post 3 (p3) at the very top
	// because it contains matches for multiple high-weight keywords.
	feed, err := pService.GetFeed(ctx, user.ID, 10, "public")
	assert.NoError(t, err)

	found_p3_at_top := false
	if len(feed.Posts) > 0 {
		for i, p := range feed.Posts {
			t.Logf("Feed Position %d: %s (ID: %s)", i, p.Content, p.ID.Hex())
		}
		// P3 must be highly ranked.
		// Note: pInterest itself will be at the top because it's newest and matches interest perfectly.
		// So we check if p3 is at least at position 1 (above p2 and p1).
		assert.True(t, feed.Posts[0].ID.Hex() == p3.ID.Hex() || feed.Posts[1].ID.Hex() == p3.ID.Hex(), "Recommended post p3 should be at the top or follow the interest post")
		found_p3_at_top = true
	}
	assert.True(t, found_p3_at_top)
}
