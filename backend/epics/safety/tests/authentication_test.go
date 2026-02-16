package tests

import (
	"context"
	"errors"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/identity/service"
	"strings"
	"testing"
	"time"

	"federated-social/backend/config"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func init() {
	config.AppConfig = &config.Config{
		JWTSecret: "test-secret",
	}
}

// US4.0.2: Secure Password Storage
func TestAuth_Signup_PasswordHashing(t *testing.T) {
	mockUserRepo := &MockUserRepository{}
	mockActivityRepo := &MockActivityRepository{}
	
	// Setup generic mocks
	mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }
	mockUserRepo.FindByEmailFunc = func(ctx context.Context, email string) (*models.User, error) { return nil, errors.New("not found") }
	mockUserRepo.FindByUsernameFunc = func(ctx context.Context, username string) (*models.User, error) { return nil, errors.New("not found") }

	var capturedUser *models.User
	mockUserRepo.CreateUserFunc = func(ctx context.Context, user *models.User) error {
		capturedUser = user
		user.ID = primitive.NewObjectID()
		return nil
	}

	svc := service.NewAuthServiceWithDependencies(
		mockUserRepo,
		&MockSessionRepository{},
		mockActivityRepo,
		&MockVerificationRepository{},
		&MockEmailSender{},
	)

	req := dto.SignupRequest{
		Username: "secureuser",
		Email:    "secure@example.com",
		Password: "MySecretPassword123!",
	}

	_, err := svc.Signup(context.Background(), req)
	if err != nil {
		t.Fatalf("Signup failed: %v", err)
	}

	if capturedUser == nil {
		t.Fatal("User was not created")
	}

	// Verify Password is hashed (US4.0.2)
	if capturedUser.PasswordHash == req.Password {
		t.Error("Password was stored in plain text!")
	}
	
	err = bcrypt.CompareHashAndPassword([]byte(capturedUser.PasswordHash), []byte(req.Password))
	if err != nil {
		t.Error("Password hash does not match original password")
	}
}

// US4.0.1: OTP Integration
func TestAuth_Login_OTPGeneration(t *testing.T) {
	mockUserRepo := &MockUserRepository{}
	mockVerificationRepo := &MockVerificationRepository{}
	mockEmailSender := &MockEmailSender{}
	
	password := "password123"
	hashed, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	
	user := &models.User{
		ID:           primitive.NewObjectID(),
		Email:        "otp@example.com",
		PasswordHash: string(hashed),
		IsActive:     true,
		Is2FAEnabled: true, // US4.0.1: OTP enabled
	}

	mockUserRepo.FindByEmailFunc = func(ctx context.Context, email string) (*models.User, error) {
		return user, nil
	}
	
	var capturedCode string
	mockVerificationRepo.CreateVerificationCodeFunc = func(ctx context.Context, code *models.VerificationCode) error {
		capturedCode = code.Code
		return nil
	}
	
	mockEmailSender.SendVerificationEmailFunc = func(to, code string) error {
		if code != capturedCode {
			return errors.New("code mismatch")
		}
		return nil
	}

	svc := service.NewAuthServiceWithDependencies(
		mockUserRepo,
		&MockSessionRepository{},
		&MockActivityRepository{},
		mockVerificationRepo,
		mockEmailSender,
	)

	req := dto.LoginRequest{
		Email:    "otp@example.com",
		Password: password,
	}

	resp, err := svc.InitiateLogin(context.Background(), req, "127.0.0.1", "test-agent")
	if err != nil {
		t.Fatalf("InitiateLogin failed: %v", err)
	}

	// Should return a string message, not a login response
	msg, ok := resp.(string)
	if !ok {
		t.Fatal("Expected string response for OTP flow")
	}
	if !strings.Contains(msg, "Verification code sent") {
		t.Errorf("Unexpected response: %s", msg)
	}
}

func TestAuth_VerifyOTP(t *testing.T) {
	mockUserRepo := &MockUserRepository{}
	mockVerificationRepo := &MockVerificationRepository{}
	mockSessionRepo := &MockSessionRepository{}
	mockActivityRepo := &MockActivityRepository{}

	user := &models.User{
		ID:       primitive.NewObjectID(),
		Email:    "verify@example.com",
		IsActive: true,
		Role:     "user",
	}

	validCode := "123456"
	storedCode := &models.VerificationCode{
		UserID:    user.ID,
		Code:      validCode,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	mockUserRepo.FindByEmailFunc = func(ctx context.Context, email string) (*models.User, error) {
		return user, nil
	}
	mockVerificationRepo.FindLatestByUserIDFunc = func(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error) {
		return storedCode, nil
	}
	mockSessionRepo.CreateSessionFunc = func(ctx context.Context, session *models.Session) error {
		return nil
	}
	mockActivityRepo.LogActivityFunc = func(ctx context.Context, log *models.ActivityLog) error { return nil }

	svc := service.NewAuthServiceWithDependencies(
		mockUserRepo,
		mockSessionRepo,
		mockActivityRepo,
		mockVerificationRepo,
		&MockEmailSender{},
	)

	req := dto.VerifyOTPRequest{
		Email: "verify@example.com",
		Code:  validCode,
	}

	resp, err := svc.VerifyOTP(context.Background(), req, "127.0.0.1", "test-agent")
	if err != nil {
		t.Fatalf("VerifyOTP failed: %v", err)
	}

	if resp.Token == "" {
		t.Error("Expected token in response")
	}
}
