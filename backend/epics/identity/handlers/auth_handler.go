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

	respondSuccess(w, "Account created successfully", user.ToPublicUser(), http.StatusCreated)
}

// Login handles user authentication trigger (US1.2 updated)
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	msg, err := h.authService.InitiateLogin(r.Context(), req)
	if err != nil {
		respondError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	respondSuccess(w, msg, nil, http.StatusOK)
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

// Helper to extract token from Authorization header
func extractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}
	return ""
}
