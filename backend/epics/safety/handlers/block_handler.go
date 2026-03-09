package handlers

import (
	"federated-social/backend/epics/safety/repository"
	"federated-social/backend/epics/safety/service"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BlockHandler struct {
	blockService *service.BlockService
}

func NewBlockHandler() *BlockHandler {
	repo := repository.NewBlockRepository()
	svc := service.NewBlockService(repo)
	return &BlockHandler{
		blockService: svc,
	}
}

// BlockUser handles POST /api/users/{id}/block
// Extracts the target ID and the authenticated user's ID to create a block.
func (h *BlockHandler) BlockUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	blockedIDStr := vars["id"]

	blockedID, err := primitive.ObjectIDFromHex(blockedIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid authenticated user ID", http.StatusUnauthorized)
		return
	}

	if err := h.blockService.BlockUser(r.Context(), userID, blockedID); err != nil {
		if err.Error() == "user already blocked" {
			respondError(w, err.Error(), http.StatusConflict)
		} else if err.Error() == "cannot block yourself" {
			respondError(w, err.Error(), http.StatusBadRequest)
		} else {
			respondError(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	respondSuccess(w, "User blocked successfully", nil, http.StatusCreated)
}

// UnblockUser handles unblocking of a user
func (h *BlockHandler) UnblockUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	blockedIDStr := vars["id"]

	blockedID, err := primitive.ObjectIDFromHex(blockedIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid authenticated user ID", http.StatusUnauthorized)
		return
	}

	if err := h.blockService.UnblockUser(r.Context(), userID, blockedID); err != nil {
		if err.Error() == "block not found" {
			respondError(w, err.Error(), http.StatusNotFound)
		} else {
			respondError(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	respondSuccess(w, "User unblocked successfully", nil, http.StatusOK)
}

// GetBlockedUsers returns a list of users blocked by the current user
func (h *BlockHandler) GetBlockedUsers(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value(middleware.UserIDKey).(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid authenticated user ID", http.StatusUnauthorized)
		return
	}

	blocks, err := h.blockService.GetBlockedUsers(r.Context(), userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Blocked users retrieved successfully", blocks, http.StatusOK)
}
