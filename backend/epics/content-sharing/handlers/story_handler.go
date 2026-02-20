package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/service"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StoryHandler struct {
	storyService *service.StoryService
}

func NewStoryHandler() *StoryHandler {
	return &StoryHandler{
		storyService: service.NewStoryService(),
	}
}

// CreateStory handles POST /api/stories
func (h *StoryHandler) CreateStory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	var req dto.CreateStoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	story, err := h.storyService.CreateStory(r.Context(), userID, req)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Story created successfully", story, http.StatusCreated)
}

// GetActiveStories handles GET /api/stories
func (h *StoryHandler) GetActiveStories(w http.ResponseWriter, r *http.Request) {
	// Optional Auth because public stories might be visible to anyone in the instance
	stories, err := h.storyService.GetActiveStories(r.Context())
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Stories retrieved successfully", stories, http.StatusOK)
}

// DeleteStory handles DELETE /api/stories/:id
func (h *StoryHandler) DeleteStory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	storyID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid story ID", http.StatusBadRequest)
		return
	}

	if err := h.storyService.DeleteStory(r.Context(), storyID, userID); err != nil {
		respondError(w, err.Error(), http.StatusForbidden)
		return
	}

	respondSuccess(w, "Story deleted successfully", nil, http.StatusOK)
}
