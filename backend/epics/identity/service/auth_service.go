package service

import (
	"context"
	"errors"
	"federated-social/backend/config"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/identity/repository"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo     *repository.UserRepository
	sessionRepo  *repository.SessionRepository
	activityRepo *repository.ActivityRepository
}

func NewAuthService() *AuthService {
	return &AuthService{
		userRepo:     repository.NewUserRepository(),
		sessionRepo:  repository.NewSessionRepository(),
		activityRepo: repository.NewActivityRepository(),
	}
}

// Signup creates a new user account (US1.1)
func (s *AuthService) Signup(ctx context.Context, req dto.SignupRequest) (*models.User, error) {
	// Validate input
	if req.Username == "" || req.Email == "" || req.Password == "" {
		return nil, errors.New("username, email, and password are required")
	}

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
		InstanceID:        "default", // TODO: Get from config
	}

	if err := s.userRepo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	// Log activity
	s.logActivity(ctx, user.ID, "signup", "User account created", "", "")

	return user, nil
}

// Login authenticates a user and returns a JWT token (US1.2)
func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest, ipAddress, userAgent string) (*dto.LoginResponse, error) {
	// Find user
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check if account is deactivated
	if user.IsDeactivated {
		return nil, errors.New("account is deactivated")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Generate JWT token
	expiresAt := time.Now().Add(24 * time.Hour)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
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
	s.logActivity(ctx, user.ID, "login", "User logged in", ipAddress, userAgent)

	return &dto.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		User:      user.ToPublicUser(),
	}, nil
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
