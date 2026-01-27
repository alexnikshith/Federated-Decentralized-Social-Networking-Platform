package handlers

import (
	"federated-social/backend/epics/content-sharing/service"
	"federated-social/backend/middleware"
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
func (h *FollowHandler) Follow(w http.ResponseWriter, r *http.Request) {
	followerID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	followingID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.followService.Follow(r.Context(), followerID, followingID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
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
