package handlers

import (
	"federated-social/backend/epics/content-sharing/service"
	"federated-social/backend/middleware"
	"log"
	"net/http"

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
		log.Printf("Follow error for follower=%s, following=%s: %v", followerID.Hex(), followingID.Hex(), err)
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
