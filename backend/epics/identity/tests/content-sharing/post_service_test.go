package content_sharing_test

import (
	"context"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/service"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestPostService_CreatePost(t *testing.T) {
	ctx := context.Background()
	userID := primitive.NewObjectID()
	mockRepo := new(MockPostRepository)

	// Create service with mock repo
	// Using the newly added WithDeps constructor
	s := service.NewPostServiceWithDeps(mockRepo, nil, nil, nil, nil, nil, nil)

	t.Run("Successfully Create Post", func(t *testing.T) {
		req := dto.CreatePostRequest{
			Content: "This is a test post",
		}

		// Mock expectations
		mockRepo.On("CreatePost", ctx, mock.AnythingOfType("*models.Post")).Return(nil).Run(func(args mock.Arguments) {
			post := args.Get(1).(*models.Post)
			post.ID = primitive.NewObjectID()
		})

		post, err := s.CreatePost(ctx, userID, req)

		assert.NoError(t, err)
		assert.NotNil(t, post)
		assert.Equal(t, "This is a test post", post.Content)
		assert.Equal(t, userID, post.AuthorID)
		mockRepo.AssertExpectations(t)
	})
}

func TestPostService_LikePost(t *testing.T) {
	ctx := context.Background()
	userID := primitive.NewObjectID()
	postID := primitive.NewObjectID()
	mockRepo := new(MockPostRepository)

	s := service.NewPostServiceWithDeps(mockRepo, nil, nil, nil, nil, nil, nil)

	t.Run("Successfully Like Post", func(t *testing.T) {
		// Mock GetPostByID
		mockRepo.On("GetPostByID", ctx, postID).Return(&models.Post{ID: postID, AuthorID: primitive.NewObjectID()}, nil)

		// Mock CreateLike
		mockRepo.On("CreateLike", ctx, mock.AnythingOfType("*models.Like")).Return(nil)

		err := s.LikePost(ctx, postID, userID)

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})
}

func TestPostService_DeletePost(t *testing.T) {
	ctx := context.Background()
	userID := primitive.NewObjectID()
	postID := primitive.NewObjectID()
	mockRepo := new(MockPostRepository)

	s := service.NewPostServiceWithDeps(mockRepo, nil, nil, nil, nil, nil, nil)

	t.Run("Successfully Delete Own Post", func(t *testing.T) {
		// Mock GetPostByIDAdmin
		mockRepo.On("GetPostByIDAdmin", ctx, postID).Return(&models.Post{ID: postID, AuthorID: userID}, nil)

		// Mock DeletePost
		mockRepo.On("DeletePost", ctx, postID).Return(nil)

		err := s.DeletePost(ctx, postID, userID)

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Fail Delete Other's Post", func(t *testing.T) {
		otherUserID := primitive.NewObjectID()
		// Mock GetPostByIDAdmin
		mockRepo.On("GetPostByIDAdmin", ctx, postID).Return(&models.Post{ID: postID, AuthorID: otherUserID}, nil)

		err := s.DeletePost(ctx, postID, userID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unauthorized")
	})
}
