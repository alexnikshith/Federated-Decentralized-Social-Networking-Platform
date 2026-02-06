package handlers

import (
	"federated-social/backend/epics/content-sharing/service"
	"net/http"
	"strconv"
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
	if query == "" {
		respondError(w, "Search query is required", http.StatusBadRequest)
		return
	}

	// Get limit from query params (default 20)
	limit := int64(20)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = parsedLimit
		}
	}

	users, err := h.searchService.SearchUsers(r.Context(), query, limit)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Users found", users, http.StatusOK)
}
