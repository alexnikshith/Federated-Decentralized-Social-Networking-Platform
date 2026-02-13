package handlers

import (
	"federated-social/backend/epics/content-sharing/service"
	"federated-social/backend/middleware"
	"net/http"
	"strconv"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SearchHandler struct {
	searchService *service.SearchService
}

func NewSearchHandler() *SearchHandler {
	return &SearchHandler{
		searchService: service.NewSearchService(),
	}
}

// SearchUsers handles GET /api/users/search?q=query
// It searches for users by username or other fields based on the query parameter `q`.
func (h *SearchHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	// If query is empty, we still want to proceed to get either no results or some defaults,
	// rather than returning a 400 error which breaks the UI flow.
	// The repository handles empty query by returning an empty slice.

	// Get limit from query params (default 20)
	limit := int64(20)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = parsedLimit
		}
	}

	// Get requesting user ID if authenticated (OptionalAuth middleware allows this)
	var requestingUserID *primitive.ObjectID
	if uid := middleware.GetUserIDFromContext(r.Context()); uid != primitive.NilObjectID {
		requestingUserID = &uid
	}

	users, err := h.searchService.SearchUsers(r.Context(), query, limit, requestingUserID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Users found", users, http.StatusOK)
}
