package service

import (
	"context"
	"crypto/rand"
	"errors"
	"federated-social/backend/config"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/identity/repository"
	"federated-social/backend/pkg/email"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo         UserRepository
	sessionRepo      SessionRepository
	activityRepo     ActivityRepository
	verificationRepo VerificationRepository
	emailSender      EmailSender
}

func NewAuthService() *AuthService {
	return &AuthService{
		userRepo:         repository.NewUserRepository(),
		sessionRepo:      repository.NewSessionRepository(),
		activityRepo:     repository.NewActivityRepository(),
		verificationRepo: repository.NewVerificationRepository(),
		emailSender:      email.NewEmailSender(),
	}
}

// Signup creates a new user account (US1.1)
// It validates unique constraints (email, username), hashes the password,
// and creates the initial user record with default settings.
func (s *AuthService) Signup(ctx context.Context, req dto.SignupRequest) (*models.User, error) {
	// Validate input
	if req.Username == "" || req.Email == "" || req.Password == "" {
		return nil, errors.New("username, email, and password are required")
	}
	if strings.Contains(req.Username, " ") {
		return nil, errors.New("username cannot contain spaces")
	}

	// Normalize email
	req.Email = strings.ToLower(req.Email)

	// Check if user already exists
	if _, err := s.userRepo.FindByEmail(ctx, req.Email); err == nil {
		return nil, errors.New("email already registered")
	}

	if _, err := s.userRepo.FindByUsername(ctx, req.Username); err == nil {
		return nil, errors.New("username already taken")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Username:          req.Username,
		Email:             req.Email,
		PasswordHash:      string(hashedPassword),
		DisplayName:       req.DisplayName,
		ProfileVisibility: "public",
		InstanceID:        "default",
		Is2FAEnabled:      true,
		IsActive:          true,
		Role:              "user",
		IsDiscoverable:    req.IsDiscoverable,
	}

	if err := s.userRepo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	// Log activity
	s.logActivity(ctx, user.ID, "signup", "User account created", "", "")

	return user, nil
}

// InitiateLogin validates credentials and triggers 2FA or logs in directly (US1.2 updated)
// If 2FA is enabled, it sends an OTP and returns a string message.
// If 2FA is disabled, it returns a JWT token directly.
func (s *AuthService) InitiateLogin(ctx context.Context, req dto.LoginRequest, ipAddress, userAgent string) (interface{}, error) {
	// Normalize email
	req.Email = strings.ToLower(req.Email)

	// Find user
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check if account is deactivated
	if user.IsDeactivated || !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check if 2FA is enabled
	fmt.Printf("DEBUG: Login attempt for %s, Is2FAEnabled: %v\n", user.Email, user.Is2FAEnabled)
	if user.Is2FAEnabled {
		// Generate OTP
		code, err := generateRandomCode(6)
		if err != nil {
			return nil, err
		}

		// Save verification code
		verificationCode := &models.VerificationCode{
			UserID:    user.ID,
			Code:      code,
			ExpiresAt: time.Now().Add(10 * time.Minute),
		}

		if err := s.verificationRepo.CreateVerificationCode(ctx, verificationCode); err != nil {
			return nil, err
		}

		// Send email
		if err := s.emailSender.SendVerificationEmail(user.Email, code); err != nil {
			return nil, fmt.Errorf("failed to send verification email: %v", err)
		}

		return "Verification code sent to your email", nil
	}

	// Generate JWT token
	expiresAt := time.Now().Add(24 * time.Hour)
	role := user.Role
	if role == "" {
		role = "user"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    role,
		"exp":     expiresAt.Unix(),
	})

	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return nil, err
	}

	// Store session
	session := &models.Session{
		UserID:    user.ID,
		Token:     tokenString,
		ExpiresAt: expiresAt,
	}
	if err := s.sessionRepo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	// Log activity
	s.logActivity(ctx, user.ID, "login", "User logged in (2FA disabled)", ipAddress, userAgent)

	publicUser := user.ToPrivateUser()

	return &dto.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		User:      publicUser,
	}, nil
}

// VerifyOTP validates the code and logs the user in
func (s *AuthService) VerifyOTP(ctx context.Context, req dto.VerifyOTPRequest, ipAddress, userAgent string) (*dto.LoginResponse, error) {
	// Normalize email
	req.Email = strings.ToLower(req.Email)

	// Find user
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Check if account is deactivated
	if user.IsDeactivated || !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	// Find latest verification code
	storedCode, err := s.verificationRepo.FindLatestByUserID(ctx, user.ID)
	if err != nil {
		return nil, errors.New("invalid or expired verification code")
	}

	// Check if code matches
	if storedCode.Code != req.Code {
		return nil, errors.New("invalid verification code")
	}

	// Check if expired
	if time.Now().After(storedCode.ExpiresAt) {
		return nil, errors.New("verification code expired")
	}

	// Generate JWT token
	expiresAt := time.Now().Add(24 * time.Hour)
	role := user.Role
	if role == "" {
		role = "user"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    role,
		"exp":     expiresAt.Unix(),
	})

	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return nil, err
	}

	// Store session
	session := &models.Session{
		UserID:    user.ID,
		Token:     tokenString,
		ExpiresAt: expiresAt,
	}
	if err := s.sessionRepo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	// Log activity
	s.logActivity(ctx, user.ID, "login", "User logged in via 2FA", ipAddress, userAgent)

	publicUser := user.ToPrivateUser()

	return &dto.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		User:      publicUser,
	}, nil
}

func generateRandomCode(length int) (string, error) {
	const charset = "0123456789"
	code := make([]byte, length)
	for i := range code {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		code[i] = charset[num.Int64()]
	}
	return string(code), nil
}

// Logout invalidates the user's session (US1.8)
func (s *AuthService) Logout(ctx context.Context, token string, userID primitive.ObjectID) error {
	if err := s.sessionRepo.InvalidateSession(ctx, token); err != nil {
		return err
	}

	// Log activity
	s.logActivity(ctx, userID, "logout", "User logged out", "", "")

	return nil
}

// ChangePassword updates user password (US1.6)
func (s *AuthService) ChangePassword(ctx context.Context, userID primitive.ObjectID, req dto.ChangePasswordRequest) error {
	// Get user
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("old password is incorrect")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password
	update := bson.M{"password_hash": string(hashedPassword)}
	if err := s.userRepo.UpdateUser(ctx, userID, update); err != nil {
		return err
	}

	// Invalidate all sessions for security
	s.sessionRepo.InvalidateAllUserSessions(ctx, userID)

	// Log activity
	s.logActivity(ctx, userID, "password_change", "Password changed", "", "")

	return nil
}

// Toggle2FA updates user 2FA status
func (s *AuthService) Toggle2FA(ctx context.Context, userID primitive.ObjectID, enable bool) error {
	fmt.Printf("DEBUG: Toggle2FA called for user %s, setting to %v\n", userID.Hex(), enable)
	update := bson.M{"is_2fa_enabled": enable}
	if err := s.userRepo.UpdateUser(ctx, userID, update); err != nil {
		return err
	}
	s.logActivity(ctx, userID, "toggle_2fa", fmt.Sprintf("2FA enabled: %v", enable), "", "")
	return nil
}

// SyncProfile re-issues a token and returns updated user info
func (s *AuthService) SyncProfile(ctx context.Context, userID primitive.ObjectID) (*dto.LoginResponse, error) {
	// Find user
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Generate JWT token
	expiresAt := time.Now().Add(24 * time.Hour)
	role := user.Role
	if role == "" {
		role = "user"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    role,
		"exp":     expiresAt.Unix(),
	})

	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return nil, err
	}

	// Store session
	session := &models.Session{
		UserID:    user.ID,
		Token:     tokenString,
		ExpiresAt: expiresAt,
	}
	if err := s.sessionRepo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	publicUser := user.ToPrivateUser()

	return &dto.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		User:      publicUser,
	}, nil
}

// CheckEmailExists checks if a user exists with the given email
func (s *AuthService) CheckEmailExists(ctx context.Context, email string) (bool, error) {
	email = strings.ToLower(email)
	_, err := s.userRepo.FindByEmail(ctx, email)
	if err == nil {
		return true, nil
	}
	return false, nil
}

// CheckUsernameExists checks if a username is already taken
func (s *AuthService) CheckUsernameExists(ctx context.Context, username string) (bool, error) {
	_, err := s.userRepo.FindByUsername(ctx, username)
	if err == nil {
		return true, nil
	}
	return false, nil
}

// ForgotPassword initiates the password reset flow
func (s *AuthService) ForgotPassword(ctx context.Context, req dto.ForgotPasswordRequest) error {
	// Normalize email
	req.Email = strings.ToLower(req.Email)

	// Find user
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		// Do not reveal if user exists, but we can return nil to simulate success
		return nil
	}

	// Generate OTP
	code, err := generateRandomCode(6)
	if err != nil {
		return err
	}

	// Save verification code
	verificationCode := &models.VerificationCode{
		UserID:    user.ID,
		Code:      code,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	if err := s.verificationRepo.CreateVerificationCode(ctx, verificationCode); err != nil {
		return err
	}

	// Send email
	if err := s.emailSender.SendPasswordResetEmail(user.Email, code); err != nil {
		return fmt.Errorf("failed to send password reset email: %v", err)
	}

	// Log activity
	s.logActivity(ctx, user.ID, "forgot_password", "Password reset requested", "", "")

	return nil
}

// VerifyResetCode checks if the reset code is valid without performing the reset
func (s *AuthService) VerifyResetCode(ctx context.Context, req dto.VerifyOTPRequest) error {
	// Normalize email
	req.Email = strings.ToLower(req.Email)

	// Find user
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return errors.New("invalid request")
	}

	// Find latest verification code
	storedCode, err := s.verificationRepo.FindLatestByUserID(ctx, user.ID)
	if err != nil {
		return errors.New("invalid or expired verification code")
	}

	// Check if code matches
	if storedCode.Code != req.Code {
		return errors.New("invalid verification code")
	}

	// Check if expired
	if time.Now().After(storedCode.ExpiresAt) {
		return errors.New("verification code expired")
	}

	return nil
}

// ResetPassword completes the password reset flow
func (s *AuthService) ResetPassword(ctx context.Context, req dto.ResetPasswordRequest) error {
	// Normalize email
	req.Email = strings.ToLower(req.Email)

	// Find user
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return errors.New("invalid request")
	}

	// Find latest verification code
	storedCode, err := s.verificationRepo.FindLatestByUserID(ctx, user.ID)
	if err != nil {
		return errors.New("invalid or expired verification code")
	}

	// Check if code matches
	if storedCode.Code != req.Code {
		return errors.New("invalid verification code")
	}

	// Check if expired
	if time.Now().After(storedCode.ExpiresAt) {
		return errors.New("verification code expired")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password
	update := bson.M{"password_hash": string(hashedPassword)}
	if err := s.userRepo.UpdateUser(ctx, user.ID, update); err != nil {
		return err
	}

	// Invalidate all sessions for security
	s.sessionRepo.InvalidateAllUserSessions(ctx, user.ID)

	// Log activity
	s.logActivity(ctx, user.ID, "password_reset", "Password reset successfully", "", "")

	return nil
}

// Helper function to log activity
func (s *AuthService) logActivity(ctx context.Context, userID primitive.ObjectID, action, details, ipAddress, userAgent string) {
	log := &models.ActivityLog{
		UserID:    userID,
		Action:    action,
		Details:   details,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	s.activityRepo.LogActivity(ctx, log)
}
