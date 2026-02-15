package service

import (
	"context"
	"errors"
	"federated-social/backend/config"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"

	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthService_Signup(t *testing.T) {
	tests := []struct {
		name          string
		req           dto.SignupRequest
		mockSetup     func(userRepo *MockUserRepository)
		expectedError string
	}{
		{
			name: "Success",
			req: dto.SignupRequest{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "password123",
			},
			mockSetup: func(userRepo *MockUserRepository) {
				userRepo.FindByEmailFunc = func(ctx context.Context, email string) (*models.User, error) {
					return nil, errors.New("user not found")
				}
				userRepo.FindByUsernameFunc = func(ctx context.Context, username string) (*models.User, error) {
					return nil, errors.New("user not found")
				}
				userRepo.CreateUserFunc = func(ctx context.Context, user *models.User) error {
					user.ID = primitive.NewObjectID()
					return nil
				}
			},
			expectedError: "",
		},
		{
			name: "Duplicate Email",
			req: dto.SignupRequest{
				Username: "testuser2",
				Email:    "existing@example.com",
				Password: "password123",
			},
			mockSetup: func(userRepo *MockUserRepository) {
				userRepo.FindByEmailFunc = func(ctx context.Context, email string) (*models.User, error) {
					return &models.User{Email: "existing@example.com"}, nil
				}
			},
			expectedError: "email already registered",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := &MockUserRepository{}
			mockActivityRepo := &MockActivityRepository{}

			// Set up default mocks to avoid nil pointer exceptions if not specified
			mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }

			if tt.mockSetup != nil {
				tt.mockSetup(mockUserRepo)
			}

			service := &AuthService{
				userRepo:     mockUserRepo,
				activityRepo: mockActivityRepo,
				// Add other nil mocks as they are not used in Signup
				sessionRepo:      &MockSessionRepository{},
				verificationRepo: &MockVerificationRepository{},
				emailSender:      &MockEmailSender{},
			}

			_, err := service.Signup(context.Background(), tt.req)

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

func TestAuthService_InitiateLogin(t *testing.T) {
	// Initialize config for JWT generation
	config.AppConfig = &config.Config{
		JWTSecret: "test-secret-key",
	}

	// Helper to create hashed password
	password := "password123"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	validUser := &models.User{
		ID:           primitive.NewObjectID(),
		Email:        "test@example.com",
		PasswordHash: string(hashedPassword),
		IsActive:     true,
		Is2FAEnabled: false,
	}

	tests := []struct {
		name          string
		req           dto.LoginRequest
		mockSetup     func(userRepo *MockUserRepository, sessionRepo *MockSessionRepository)
		expectedError string
	}{
		{
			name: "Success - No 2FA",
			req: dto.LoginRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			mockSetup: func(userRepo *MockUserRepository, sessionRepo *MockSessionRepository) {
				userRepo.FindByEmailFunc = func(ctx context.Context, email string) (*models.User, error) {
					return validUser, nil
				}
				sessionRepo.CreateSessionFunc = func(ctx context.Context, session *models.Session) error {
					return nil
				}
			},
			expectedError: "",
		},
		{
			name: "Invalid Password",
			req: dto.LoginRequest{
				Email:    "test@example.com",
				Password: "wrongpassword",
			},
			mockSetup: func(userRepo *MockUserRepository, sessionRepo *MockSessionRepository) {
				userRepo.FindByEmailFunc = func(ctx context.Context, email string) (*models.User, error) {
					return validUser, nil
				}
			},
			expectedError: "invalid credentials",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := &MockUserRepository{}
			mockSessionRepo := &MockSessionRepository{}
			mockActivityRepo := &MockActivityRepository{}

			mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }

			if tt.mockSetup != nil {
				tt.mockSetup(mockUserRepo, mockSessionRepo)
			}

			service := &AuthService{
				userRepo:         mockUserRepo,
				sessionRepo:      mockSessionRepo,
				activityRepo:     mockActivityRepo,
				verificationRepo: &MockVerificationRepository{},
				emailSender:      &MockEmailSender{},
			}

			_, err := service.InitiateLogin(context.Background(), tt.req, "127.0.0.1", "test-agent")

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

func TestAuthService_Logout(t *testing.T) {
	tests := []struct {
		name        string
		token       string
		userID      primitive.ObjectID
		mockSetup   func(sessionRepo *MockSessionRepository)
		expectError bool
	}{
		{
			name:   "Success",
			token:  "valid-token",
			userID: primitive.NewObjectID(),
			mockSetup: func(sessionRepo *MockSessionRepository) {
				sessionRepo.InvalidateSessionFunc = func(ctx context.Context, token string) error {
					return nil
				}
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSessionRepo := &MockSessionRepository{}
			mockActivityRepo := &MockActivityRepository{}
			mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }

			if tt.mockSetup != nil {
				tt.mockSetup(mockSessionRepo)
			}

			service := &AuthService{
				sessionRepo:      mockSessionRepo,
				activityRepo:     mockActivityRepo,
				userRepo:         &MockUserRepository{},
				verificationRepo: &MockVerificationRepository{},
				emailSender:      &MockEmailSender{},
			}

			err := service.Logout(context.Background(), tt.token, tt.userID)

			if tt.expectError {
				if err == nil {
					t.Errorf("expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestAuthService_ChangePassword(t *testing.T) {
	userID := primitive.NewObjectID()
	password := "oldpass"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	tests := []struct {
		name          string
		req           dto.ChangePasswordRequest
		mockSetup     func(userRepo *MockUserRepository, sessionRepo *MockSessionRepository)
		expectedError string
	}{
		{
			name: "Success",
			req:  dto.ChangePasswordRequest{OldPassword: "oldpass", NewPassword: "newpass"},
			mockSetup: func(userRepo *MockUserRepository, sessionRepo *MockSessionRepository) {
				userRepo.FindByIDFunc = func(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
					return &models.User{ID: userID, PasswordHash: string(hashedPassword)}, nil
				}
				userRepo.UpdateUserFunc = func(ctx context.Context, id primitive.ObjectID, update bson.M) error {
					return nil
				}
				sessionRepo.InvalidateAllUserSessionsFunc = func(ctx context.Context, id primitive.ObjectID) error {
					return nil
				}
			},
			expectedError: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := &MockUserRepository{}
			mockSessionRepo := &MockSessionRepository{}
			mockActivityRepo := &MockActivityRepository{}
			mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }

			if tt.mockSetup != nil {
				tt.mockSetup(mockUserRepo, mockSessionRepo)
			}

			service := &AuthService{
				userRepo:         mockUserRepo,
				sessionRepo:      mockSessionRepo,
				activityRepo:     mockActivityRepo,
				verificationRepo: &MockVerificationRepository{},
				emailSender:      &MockEmailSender{},
			}

			err := service.ChangePassword(context.Background(), userID, tt.req)

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
