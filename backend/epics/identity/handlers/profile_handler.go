package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/service"
	"federated-social/backend/middleware"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProfileHandler struct {
	profileService *service.ProfileService
}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{
		profileService: service.NewProfileService(),
	}
}

// GetProfile retrieves a user's profile (US1.4)
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	identifier := vars["id"] // This can be hex ID or username

	// Get requesting user ID if authenticated
	var requestingUserID *primitive.ObjectID
	if reqUserIDStr, ok := r.Context().Value(middleware.UserIDKey).(string); ok {
		reqUserID, err := primitive.ObjectIDFromHex(reqUserIDStr)
		if err == nil {
			requestingUserID = &reqUserID
		}
	}

	profile, err := h.profileService.GetProfileByIdOrUsername(r.Context(), identifier, requestingUserID)
	if err != nil {
		respondError(w, err.Error(), http.StatusNotFound)
		return
	}

	respondJSON(w, profile, http.StatusOK)
}

// GetMyProfile retrieves the authenticated user's profile
func (h *ProfileHandler) GetMyProfile(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	profile, err := h.profileService.GetProfile(r.Context(), userID, &userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, profile, http.StatusOK)
}

// UpdateProfile updates user profile (US1.3)
func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	profile, err := h.profileService.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		respondError(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondSuccess(w, "Profile updated successfully", profile, http.StatusOK)
}

// DeactivateAccount deactivates user account (US1.5)
func (h *ProfileHandler) DeactivateAccount(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.profileService.DeactivateAccount(r.Context(), userID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Account deactivated successfully", nil, http.StatusOK)
}

// DeleteAccount permanently deletes user account
func (h *ProfileHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.profileService.DeleteAccount(r.Context(), userID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Account deleted successfully", nil, http.StatusOK)
}

// GetActivity retrieves user activity logs (US1.7)
func (h *ProfileHandler) GetActivity(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get limit from query params
	limitStr := r.URL.Query().Get("limit")
	limit := int64(50)
	if limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = parsedLimit
		}
	}

	activities, err := h.profileService.GetActivity(r.Context(), userID, limit)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, activities, http.StatusOK)
}

// AddJoinedCommunity handles adding a community to the user's joined list
func (h *ProfileHandler) AddJoinedCommunity(w http.ResponseWriter, r *http.Request) {
	var req dto.AddCommunityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.profileService.AddJoinedCommunity(r.Context(), userID, req.CommunityID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Community added to joined list", nil, http.StatusOK)
}
