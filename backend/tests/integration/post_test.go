package integration

import (
	"context"
	contentDto "federated-social/backend/epics/content-sharing/dto"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	contentService "federated-social/backend/epics/content-sharing/service"
	identityDto "federated-social/backend/epics/identity/dto"
	identityRepo "federated-social/backend/epics/identity/repository"
	identityService "federated-social/backend/epics/identity/service"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPostFlow_Integration(t *testing.T) {
	ctx := context.Background()

	// --- Step 1: Create a User (Required for posts) ---
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{}, // Already defined in auth_test.go
	)

	user, err := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "post_tester",
		Email:    "post@tester.com",
		Password: "SecurePassword123!",
	})
	assert.NoError(t, err)

	// --- Step 2: Initialize Post Service ---
	// Using NewPostService() which initializes all real repositories
	postService := contentService.NewPostService()

	// --- Step 3: Create a Post ---
	postReq := contentDto.CreatePostRequest{
		Content: "This is a real post saved to a real MongoDB!",
	}

	post, err := postService.CreatePost(ctx, user.ID, postReq)
	assert.NoError(t, err)
	assert.NotNil(t, post)
	assert.Equal(t, user.ID, post.AuthorID)
	assert.Equal(t, postReq.Content, post.Content)

	// --- Step 4: Like the Post ---
	err = postService.LikePost(ctx, post.ID, user.ID)
	assert.NoError(t, err)

	// Verify like exists in DB directly via repository
	pR := contentRepo.NewPostRepository()
	liked, err := pR.CheckIfLiked(ctx, post.ID, user.ID)
	assert.NoError(t, err)
	assert.True(t, liked, "Post should be liked in DB")

	// --- Step 5: Comment on the Post ---
	commentReq := contentDto.CreateCommentRequest{
		Content: "Nice post! I am replying to myself.",
	}
	comment, err := postService.CreateComment(ctx, post.ID, user.ID, commentReq)
	assert.NoError(t, err)
	assert.NotNil(t, comment)
	assert.Equal(t, commentReq.Content, comment.Content)

	// --- Step 6: Verify Feed Enrichment ---
	// Get the post via the service to see if LikeCount and CommentCount are updated
	postResp, err := postService.GetPostByID(ctx, post.ID, user.ID)
	assert.NoError(t, err)
	assert.Equal(t, 1, postResp.LikeCount)
	assert.Equal(t, 1, postResp.CommentCount)
	assert.True(t, postResp.IsLiked)
}
