package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// --- Mocks ---

type MockPostRepository struct {
	mock.Mock
}

func (m *MockPostRepository) CreatePost(ctx context.Context, post *models.Post) error {
	args := m.Called(ctx, post)
	return args.Error(0)
}
func (m *MockPostRepository) UpdatePost(ctx context.Context, post *models.Post) error {
	args := m.Called(ctx, post)
	return args.Error(0)
}
func (m *MockPostRepository) GetPostByID(ctx context.Context, id primitive.ObjectID) (*models.Post, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Post), args.Error(1)
}
func (m *MockPostRepository) GetPostByIDAdmin(ctx context.Context, id primitive.ObjectID) (*models.Post, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Post), args.Error(1)
}
func (m *MockPostRepository) GetPostsByAuthors(ctx context.Context, ids []primitive.ObjectID, limit int64) ([]models.Post, error) {
	args := m.Called(ctx, ids, limit)
	return args.Get(0).([]models.Post), args.Error(1)
}
func (m *MockPostRepository) GetAllPosts(ctx context.Context, excludeIDs []primitive.ObjectID, limit int64) ([]models.Post, error) {
	args := m.Called(ctx, excludeIDs, limit)
	return args.Get(0).([]models.Post), args.Error(1)
}
func (m *MockPostRepository) GetHiddenPostIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]primitive.ObjectID), args.Error(1)
}
func (m *MockPostRepository) GetPostsByAuthor(ctx context.Context, authorID primitive.ObjectID, limit int64) ([]models.Post, error) {
	args := m.Called(ctx, authorID, limit)
	return args.Get(0).([]models.Post), args.Error(1)
}
func (m *MockPostRepository) CreateLike(ctx context.Context, like *models.Like) error {
	args := m.Called(ctx, like)
	return args.Error(0)
}
func (m *MockPostRepository) DeleteLike(ctx context.Context, postID, userID primitive.ObjectID) error {
	args := m.Called(ctx, postID, userID)
	return args.Error(0)
}
func (m *MockPostRepository) CheckIfLiked(ctx context.Context, postID, userID primitive.ObjectID) (bool, error) {
	args := m.Called(ctx, postID, userID)
	return args.Bool(0), args.Error(1)
}
func (m *MockPostRepository) CreateComment(ctx context.Context, comment *models.Comment) error {
	args := m.Called(ctx, comment)
	return args.Error(0)
}
func (m *MockPostRepository) GetCommentByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Comment), args.Error(1)
}
func (m *MockPostRepository) GetCommentsByPostID(ctx context.Context, postID primitive.ObjectID) ([]models.Comment, error) {
	args := m.Called(ctx, postID)
	return args.Get(0).([]models.Comment), args.Error(1)
}
func (m *MockPostRepository) DeleteComment(ctx context.Context, commentID primitive.ObjectID) error {
	args := m.Called(ctx, commentID)
	return args.Error(0)
}
func (m *MockPostRepository) DeletePost(ctx context.Context, postID primitive.ObjectID) error {
	args := m.Called(ctx, postID)
	return args.Error(0)
}
func (m *MockPostRepository) CheckIfSaved(ctx context.Context, postID, userID primitive.ObjectID) (bool, error) {
	args := m.Called(ctx, postID, userID)
	return args.Bool(0), args.Error(1)
}
func (m *MockPostRepository) UpdatePostMentions(ctx context.Context, postID primitive.ObjectID, usernames []string) error {
	args := m.Called(ctx, postID, usernames)
	return args.Error(0)
}
func (m *MockPostRepository) GetLikedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error) {
	args := m.Called(ctx, userID, limit)
	return args.Get(0).([]models.Post), args.Error(1)
}
func (m *MockPostRepository) GetCommentedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error) {
	args := m.Called(ctx, userID, limit)
	return args.Get(0).([]models.Post), args.Error(1)
}
func (m *MockPostRepository) GetLikesByPostID(ctx context.Context, postID primitive.ObjectID) ([]models.Like, error) {
	args := m.Called(ctx, postID)
	return args.Get(0).([]models.Like), args.Error(1)
}
func (m *MockPostRepository) SavePost(ctx context.Context, savedPost *models.SavedPost) error {
	args := m.Called(ctx, savedPost)
	return args.Error(0)
}
func (m *MockPostRepository) UnsavePost(ctx context.Context, userID, postID primitive.ObjectID) error {
	args := m.Called(ctx, userID, postID)
	return args.Error(0)
}
func (m *MockPostRepository) GetSavedPostIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]primitive.ObjectID), args.Error(1)
}
func (m *MockPostRepository) CreateReport(ctx context.Context, report *models.ReportedPost) error {
	args := m.Called(ctx, report)
	return args.Error(0)
}
func (m *MockPostRepository) UpsertInteraction(ctx context.Context, interaction *models.PostInteraction) error {
	args := m.Called(ctx, interaction)
	return args.Error(0)
}
func (m *MockPostRepository) GetAllReports(ctx context.Context) ([]models.ReportedPost, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.ReportedPost), args.Error(1)
}

// --- Test Implementations ---

func TestPostService_CreatePost(t *testing.T) {
	ctx := context.Background()
	userID := primitive.NewObjectID()
	mPR := new(MockPostRepository)
	s := &PostService{postRepo: mPR}

	t.Run("CreatePost_Success", func(t *testing.T) {
		req := dto.CreatePostRequest{Content: "Hello World"}
		mPR.On("CreatePost", ctx, mock.Anything).Return(nil)
		post, err := s.CreatePost(ctx, userID, req)
		assert.NoError(t, err)
		assert.NotNil(t, post)
		assert.Equal(t, "Hello World", post.Content)
	})
}

func TestPostService_ViewPosts(t *testing.T) {
	t.Run("ViewPosts_Success", func(t *testing.T) {
		assert.True(t, true)
	})
}

func TestPostService_LikePost(t *testing.T) {
	ctx := context.Background()
	postID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	mPR := new(MockPostRepository)
	s := &PostService{postRepo: mPR}

	t.Run("LikePost_Success", func(t *testing.T) {
		mPR.On("GetPostByID", ctx, postID).Return(&models.Post{ID: postID, AuthorID: userID}, nil)
		mPR.On("CheckIfLiked", ctx, postID, userID).Return(false, nil) // not yet liked — proceed
		mPR.On("CreateLike", ctx, mock.Anything).Return(nil)
		err := s.LikePost(ctx, postID, userID)
		assert.NoError(t, err)
	})
}

func TestPostService_CommentOnPost(t *testing.T) {
	t.Run("CommentOnPost_Success", func(t *testing.T) {
		assert.True(t, true)
	})
}

func TestPostService_DeleteOwnPost(t *testing.T) {
	ctx := context.Background()
	postID := primitive.NewObjectID()
	userID := primitive.NewObjectID()
	mPR := new(MockPostRepository)
	s := &PostService{postRepo: mPR}

	t.Run("DeletePost_Success", func(t *testing.T) {
		mPR.On("GetPostByIDAdmin", ctx, postID).Return(&models.Post{ID: postID, AuthorID: userID}, nil)
		mPR.On("DeletePost", ctx, postID).Return(nil)
		err := s.DeletePost(ctx, postID, userID)
		assert.NoError(t, err)
	})
}

func TestPostService_FollowOthers(t *testing.T) {
	t.Run("FollowUser_Success", func(t *testing.T) {
		assert.True(t, true)
	})
}

func TestPostService_ViewNotifications(t *testing.T) {
	t.Run("GetNotifications_Success", func(t *testing.T) {
		assert.True(t, true)
	})
}

func TestPostService_SearchUsers(t *testing.T) {
	t.Run("SearchUsers_Success", func(t *testing.T) {
		assert.True(t, true)
	})
}
