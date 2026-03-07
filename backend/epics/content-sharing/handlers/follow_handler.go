package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/content-sharing/service"
	"federated-social/backend/middleware"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FollowHandler struct {
	followService *service.FollowService
}

func NewFollowHandler() *FollowHandler {
	return &FollowHandler{
		followService: service.NewFollowService(),
	}
}

// Follow handles POST /api/users/:id/follow
// Initiates a follow relationship. Errors if valid ID is not provided or user tries to follow themselves (handled in service).
func (h *FollowHandler) Follow(w http.ResponseWriter, r *http.Request) {
	followerID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	followingID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.followService.Follow(r.Context(), followerID, followingID); err != nil {
		log.Printf("Follow Service Error: %v", err)
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		}
		respondError(w, err.Error(), status)
		return
	}

	respondSuccess(w, "User followed successfully", nil, http.StatusOK)
}

// Unfollow handles DELETE /api/users/:id/unfollow
func (h *FollowHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	followerID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	followingID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.followService.Unfollow(r.Context(), followerID, followingID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "User unfollowed successfully", nil, http.StatusOK)
}

// GetFollowers handles GET /api/users/:id/followers
func (h *FollowHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	followers, err := h.followService.GetFollowers(r.Context(), userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Followers retrieved successfully", followers, http.StatusOK)
}

// GetFollowing handles GET /api/users/:id/following
func (h *FollowHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	following, err := h.followService.GetFollowing(r.Context(), userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Following retrieved successfully", following, http.StatusOK)
}

// FollowHandle handles POST /api/follow
// Accepts {"handle": "username"} for local or {"handle": "@user@domain"} for federated.
// Dispatches transparently: local handles use the DB follow, remote handles use ActivityPub.
func (h *FollowHandler) FollowHandle(w http.ResponseWriter, r *http.Request) {
	followerID := middleware.GetUserIDFromContext(r.Context())
	if followerID == (primitive.NilObjectID) {
		respondError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Handle == "" {
		respondError(w, "handle is required", http.StatusBadRequest)
		return
	}

	if err := h.followService.FollowByHandle(r.Context(), followerID, body.Handle); err != nil {
		log.Printf("[FollowHandle] error: %v", err)
		status := http.StatusInternalServerError
		if err.Error() == "local user not found: "+strings.TrimPrefix(body.Handle, "@") ||
			err.Error() == "federation is not enabled" {
			status = http.StatusBadRequest
		}
		respondError(w, err.Error(), status)
		return
	}

	respondSuccess(w, "Follow request sent for "+body.Handle, nil, http.StatusOK)
}
