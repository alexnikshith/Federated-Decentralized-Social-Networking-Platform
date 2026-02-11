package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/service"
	"federated-social/backend/middleware"
	"net/http"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		authService: service.NewAuthService(),
	}
}

// Signup handles user registration (US1.1)
// It parses the request body, invokes the signup service, and returns the public user profile.
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req dto.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.authService.Signup(r.Context(), req)
	if err != nil {
		respondError(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondSuccess(w, "Account created successfully", user.ToPrivateUser(), http.StatusCreated)
}

// Login handles user authentication trigger (US1.2 updated)
// It supports both immediate JWT issuance (if 2FA off) and OTP initiation (if 2FA on).
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")

	result, err := h.authService.InitiateLogin(r.Context(), req, ipAddress, userAgent)
	if err != nil {
		respondError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// Check result type to determine response format
	switch v := result.(type) {
	case string:
		// OTP sent: Return status message
		respondSuccess(w, v, nil, http.StatusOK)
	case *dto.LoginResponse:
		// Direct Login: Return token and user info
		respondJSON(w, v, http.StatusOK)
	default:
		respondError(w, "Unexpected login response", http.StatusInternalServerError)
	}
}

// Toggle2FA handles 2FA setting update
func (h *AuthHandler) Toggle2FA(w http.ResponseWriter, r *http.Request) {
	var req dto.Toggle2FARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.authService.Toggle2FA(r.Context(), userID, req.Enable); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	status := "disabled"
	if req.Enable {
		status = "enabled"
	}
	respondSuccess(w, "2FA "+status+" successfully", nil, http.StatusOK)
}

// VerifyOTP handles OTP verification and token issuance
func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req dto.VerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get IP and User-Agent
	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")

	loginResp, err := h.authService.VerifyOTP(r.Context(), req, ipAddress, userAgent)
	if err != nil {
		respondError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	respondJSON(w, loginResp, http.StatusOK)
}

// Logout handles user logout (US1.8)
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Extract token from header
	token := extractToken(r)
	if token == "" {
		respondError(w, "Missing token", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.authService.Logout(r.Context(), token, userID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Logged out successfully", nil, http.StatusOK)
}

// ChangePassword handles password change (US1.6)
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req dto.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.authService.ChangePassword(r.Context(), userID, req); err != nil {
		respondError(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondSuccess(w, "Password changed successfully", nil, http.StatusOK)
}

// Me returns the current user profile and a fresh token
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	loginResp, err := h.authService.SyncProfile(r.Context(), userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, loginResp, http.StatusOK)
}

// CheckEmail checks if an email exists (Public endpoint)
func (h *AuthHandler) CheckEmail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	exists, err := h.authService.CheckEmailExists(r.Context(), req.Email)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"exists": exists})
}

// CheckUsername checks if a username exists (Public endpoint)
func (h *AuthHandler) CheckUsername(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	exists, err := h.authService.CheckUsernameExists(r.Context(), req.Username)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"exists": exists})
}

// Helper to extract token from Authorization header
func extractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}
	return ""
}
