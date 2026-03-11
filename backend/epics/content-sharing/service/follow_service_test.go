package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/content-sharing/models"
	federationModels "federated-social/backend/epics/federation/models"
	identityModels "federated-social/backend/epics/identity/models"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Mocks

type MockFollowRepository struct {
	mock.Mock
}

func (m *MockFollowRepository) Follow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	args := m.Called(ctx, followerID, followingID)
	return args.Error(0)
}

func (m *MockFollowRepository) Unfollow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	args := m.Called(ctx, followerID, followingID)
	return args.Error(0)
}

func (m *MockFollowRepository) IsFollowing(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error) {
	args := m.Called(ctx, followerID, followingID)
	return args.Bool(0), args.Error(1)
}

func (m *MockFollowRepository) GetFollowingIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]primitive.ObjectID), args.Error(1)
}

func (m *MockFollowRepository) GetFollowerIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]primitive.ObjectID), args.Error(1)
}

func (m *MockFollowRepository) CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockFollowRepository) CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockFollowRepository) CreateFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	args := m.Called(ctx, followerID, followingID)
	return args.Error(0)
}

func (m *MockFollowRepository) DeleteFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	args := m.Called(ctx, followerID, followingID)
	return args.Error(0)
}

func (m *MockFollowRepository) HasFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error) {
	args := m.Called(ctx, followerID, followingID)
	return args.Bool(0), args.Error(1)
}

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*identityModels.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*identityModels.User), args.Error(1)
}

func (m *MockUserRepository) FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]identityModels.User, error) {
	args := m.Called(ctx, ids)
	return args.Get(0).([]identityModels.User), args.Error(1)
}

func (m *MockUserRepository) FindByUsername(ctx context.Context, username string) (*identityModels.User, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*identityModels.User), args.Error(1)
}

type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) CreateNotification(ctx context.Context, notification *models.Notification) error {
	args := m.Called(ctx, notification)
	return args.Error(0)
}

func (m *MockNotificationRepository) UpdateNotificationType(ctx context.Context, userID, relatedUserID primitive.ObjectID, oldType, newType string) error {
	args := m.Called(ctx, userID, relatedUserID, oldType, newType)
	return args.Error(0)
}

func (m *MockNotificationRepository) DeleteNotificationByParams(ctx context.Context, userID, relatedUserID primitive.ObjectID, nType string) error {
	args := m.Called(ctx, userID, relatedUserID, nType)
	return args.Error(0)
}

type MockBlockService struct {
	mock.Mock
}

func (m *MockBlockService) IsBlocked(ctx context.Context, blockerID, blockedID primitive.ObjectID) (bool, error) {
	args := m.Called(ctx, blockerID, blockedID)
	return args.Bool(0), args.Error(1)
}

type MockFederationService struct{ mock.Mock }

func (m *MockFederationService) GetRemoteFollowers(ctx context.Context, userID primitive.ObjectID) ([]federationModels.RemoteFollower, error) {
	return nil, nil
}
func (m *MockFederationService) GetRemoteFollowing(ctx context.Context, userID primitive.ObjectID) ([]federationModels.RemoteFollow, error) {
	return nil, nil
}
func (m *MockFederationService) FollowRemoteUser(ctx context.Context, followerID primitive.ObjectID, remoteUser *federationModels.RemoteUser) error {
	args := m.Called(ctx, followerID, remoteUser)
	return args.Error(0)
}
func (m *MockFederationService) UnfollowRemoteUser(ctx context.Context, followerID primitive.ObjectID, remoteUser *federationModels.RemoteUser) error {
	return nil
}
func (m *MockFederationService) IsRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID, remoteActorID string) (bool, error) {
	return false, nil
}
func (m *MockFederationService) CountRemoteFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return 0, nil
}
func (m *MockFederationService) CountRemoteFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return 0, nil
}

type MockRemoteUserRepository struct{ mock.Mock }

func (m *MockRemoteUserRepository) GetRemoteUserByID(ctx context.Context, id primitive.ObjectID) (*federationModels.RemoteUser, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*federationModels.RemoteUser), args.Error(1)
}
func (m *MockRemoteUserRepository) GetRemoteUserByActorID(ctx context.Context, actorID string) (*federationModels.RemoteUser, error) {
	return nil, nil
}

// Tests

func TestFollowLocalUser(t *testing.T) {
	followerID := primitive.NewObjectID()
	followingID := primitive.NewObjectID()
	ctx := context.Background()

	setup := func() (*FollowService, *MockFollowRepository, *MockUserRepository, *MockNotificationRepository, *MockBlockService, *MockFederationService, *MockRemoteUserRepository) {
		mockFollowRepo := new(MockFollowRepository)
		mockUserRepo := new(MockUserRepository)
		mockNotificationRepo := new(MockNotificationRepository)
		mockBlockService := new(MockBlockService)
		mockFedService := new(MockFederationService)
		mockRemoteUserRepo := new(MockRemoteUserRepository)

		service := NewFollowServiceWithDeps(
			mockFollowRepo,
			mockUserRepo,
			mockNotificationRepo,
			mockBlockService,
			mockFedService,
			mockRemoteUserRepo,
		)
		return service, mockFollowRepo, mockUserRepo, mockNotificationRepo, mockBlockService, mockFedService, mockRemoteUserRepo
	}

	t.Run("Success", func(t *testing.T) {
		service, mockFollowRepo, mockUserRepo, mockNotificationRepo, mockBlockService, _, _ := setup()

		// Mock UserRepo finding the user (Local user exists)
		mockUserRepo.On("FindByID", ctx, followingID).Return(&identityModels.User{ID: followingID}, nil)

		// Mock BlockService (Not blocked)
		mockBlockService.On("IsBlocked", ctx, followerID, followingID).Return(false, nil)

		// Mock IsFollowing (Not already following)
		mockFollowRepo.On("IsFollowing", ctx, followerID, followingID).Return(false, nil)

		// Mock Follow (Success)
		mockFollowRepo.On("Follow", ctx, followerID, followingID).Return(nil)

		// Mock Notification
		mockNotificationRepo.On("CreateNotification", ctx, mock.AnythingOfType("*models.Notification")).Return(nil)

		err := service.Follow(ctx, followerID, followingID)

		assert.NoError(t, err)
		mockFollowRepo.AssertCalled(t, "Follow", ctx, followerID, followingID)
		mockNotificationRepo.AssertCalled(t, "CreateNotification", ctx, mock.Anything)
	})

	t.Run("UserNotFound", func(t *testing.T) {
		service, _, mockUserRepo, _, _, _, mockRemoteUserRepo := setup()

		// Mock UserRepo failing (Local user not found)
		mockUserRepo.On("FindByID", ctx, followingID).Return(nil, errors.New("not found"))

		// Mock RemoteUserRepo failing (Remote user not found either)
		mockRemoteUserRepo.On("GetRemoteUserByID", ctx, followingID).Return(nil, errors.New("not found"))

		err := service.Follow(ctx, followerID, followingID)

		assert.Error(t, err)
		assert.Equal(t, "user not found", err.Error())
	})

	t.Run("AlreadyFollowing", func(t *testing.T) {
		service, mockFollowRepo, mockUserRepo, _, mockBlockService, _, _ := setup()

		// Mock UserRepo finding the user
		mockUserRepo.On("FindByID", ctx, followingID).Return(&identityModels.User{ID: followingID}, nil)

		// Mock BlockService
		mockBlockService.On("IsBlocked", ctx, followerID, followingID).Return(false, nil)

		// Mock IsFollowing (Already following)
		mockFollowRepo.On("IsFollowing", ctx, followerID, followingID).Return(true, nil)

		err := service.Follow(ctx, followerID, followingID)

		assert.NoError(t, err)
		mockFollowRepo.AssertNotCalled(t, "Follow", ctx, followerID, followingID)
	})
}
