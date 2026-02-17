package service

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"

	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestProfileService_GetProfile(t *testing.T) {
	// Initialize config
	config.AppConfig = &config.Config{
		InstanceDomain: "localhost:8080",
	}

	requestingUserID := primitive.NewObjectID()
	targetUserID := primitive.NewObjectID()

	tests := []struct {
		name             string
		targetUserID     primitive.ObjectID
		requestingUserID *primitive.ObjectID
		mockSetup        func(userRepo *MockUserRepository, followService *MockFollowService)
		expectedError    string
	}{
		{
			name:             "Success - Public Profile",
			targetUserID:     targetUserID,
			requestingUserID: &requestingUserID,
			mockSetup: func(userRepo *MockUserRepository, followService *MockFollowService) {
				userRepo.FindByIDFunc = func(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
					return &models.User{
						ID:                targetUserID,
						Username:          "target",
						ProfileVisibility: "public",
					}, nil
				}
				followService.IsFollowingFunc = func(ctx context.Context, followerID, followedID primitive.ObjectID) (bool, error) {
					return false, nil
				}
			},
			expectedError: "",
		},
		{
			name:             "Success - Private Profile (Not Following)",
			targetUserID:     targetUserID,
			requestingUserID: &requestingUserID,
			mockSetup: func(userRepo *MockUserRepository, followService *MockFollowService) {
				userRepo.FindByIDFunc = func(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
					return &models.User{
						ID:                targetUserID,
						Username:          "target",
						ProfileVisibility: "private",
					}, nil
				}
				followService.IsFollowingFunc = func(ctx context.Context, followerID, followedID primitive.ObjectID) (bool, error) {
					return false, nil
				}
			},
			expectedError: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := &MockUserRepository{}
			mockFollowService := &MockFollowService{}
			mockFollowRepo := &MockFollowRepository{}
			mockPostRepo := &MockPostRepository{}

			if tt.mockSetup != nil {
				tt.mockSetup(mockUserRepo, mockFollowService)
			}

			service := &ProfileService{
				userRepo:       mockUserRepo,
				followService:  mockFollowService,
				followRepo:     mockFollowRepo,
				postRepo:       mockPostRepo,
				activityRepo:   &MockActivityRepository{}, // Add missing required mocks
				remoteUserRepo: &MockRemoteUserRepository{},
			}

			profile, err := service.GetProfile(context.Background(), tt.targetUserID, tt.requestingUserID)

			if tt.expectedError != "" {
				if err == nil {
					t.Errorf("expected error %v, got nil", tt.expectedError)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if profile != nil {
					if profile.Username != "target" {
						t.Errorf("expected username target, got %v", profile.Username)
					}
				}
			}
		})
	}
}

func TestProfileService_UpdateProfile(t *testing.T) {
	userID := primitive.NewObjectID()
	newDisplayName := "New Name"

	tests := []struct {
		name          string
		req           dto.UpdateProfileRequest
		mockSetup     func(userRepo *MockUserRepository)
		expectedError string
	}{
		{
			name: "Success",
			req: dto.UpdateProfileRequest{
				DisplayName: &newDisplayName,
			},
			mockSetup: func(userRepo *MockUserRepository) {
				userRepo.UpdateUserFunc = func(ctx context.Context, id primitive.ObjectID, update bson.M) error {
					return nil
				}
				userRepo.FindByIDFunc = func(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
					return &models.User{ID: userID, DisplayName: "New Name"}, nil
				}
			},
			expectedError: "",
		},
		{
			name: "Username Taken",
			req: dto.UpdateProfileRequest{
				Username: func() *string { s := "taken"; return &s }(),
			},
			mockSetup: func(userRepo *MockUserRepository) {
				userRepo.FindByUsernameFunc = func(ctx context.Context, username string) (*models.User, error) {
					otherID := primitive.NewObjectID()
					return &models.User{ID: otherID, Username: "taken"}, nil
				}
			},
			expectedError: "username already taken",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := &MockUserRepository{}
			mockActivityRepo := &MockActivityRepository{}
			mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }

			if tt.mockSetup != nil {
				tt.mockSetup(mockUserRepo)
			}

			service := &ProfileService{
				userRepo:     mockUserRepo,
				activityRepo: mockActivityRepo,
				followRepo:   &MockFollowRepository{},
				postRepo:     &MockPostRepository{},
			}

			_, err := service.UpdateProfile(context.Background(), userID, tt.req)

			if tt.expectedError != "" {
				if err == nil {
					t.Errorf("expected error %v, got nil", tt.expectedError)
				} else if err.Error() != tt.expectedError {
					t.Errorf("expected error %v, got %v", tt.expectedError, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestProfileService_DeactivateAccount(t *testing.T) {
	userID := primitive.NewObjectID()

	mockUserRepo := &MockUserRepository{}
	mockUserRepo.DeactivateUserFunc = func(ctx context.Context, id primitive.ObjectID) error {
		return nil
	}

	mockActivityRepo := &MockActivityRepository{}
	mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }

	service := &ProfileService{
		userRepo:     mockUserRepo,
		activityRepo: mockActivityRepo,
	}

	err := service.DeactivateAccount(context.Background(), userID)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProfileService_GetActivity(t *testing.T) {
	userID := primitive.NewObjectID()
	mockActivityRepo := &MockActivityRepository{}

	mockActivityRepo.GetUserActivityFunc = func(ctx context.Context, id primitive.ObjectID, limit int64) ([]models.ActivityLog, error) {
		return []models.ActivityLog{
			{UserID: userID, Action: "test_action", Details: "test_details"},
		}, nil
	}

	service := &ProfileService{
		activityRepo: mockActivityRepo,
	}

	activities, err := service.GetActivity(context.Background(), userID, 10)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(activities) != 1 {
		t.Errorf("expected 1 activity, got %d", len(activities))
	}
}
