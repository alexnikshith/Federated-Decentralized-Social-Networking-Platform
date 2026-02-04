package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/reports/models"
	"federated-social/backend/epics/reports/repository"
	"federated-social/backend/middleware"
	"net/http"
	"time"
)

type ReportHandler struct {
	Repo *repository.ReportRepository
}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{
		Repo: repository.NewReportRepository(),
	}
}

// Heartbeat processes a user activity heartbeat
func (h *ReportHandler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserIDFromContext(ctx)

	if err := h.Repo.IncrementActivity(ctx, userID, time.Now().UTC()); err != nil {
		http.Error(w, "Failed to record activity", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Activity recorded"})
}

// GetReport retrieves activity report for the logged in user
func (h *ReportHandler) GetReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserIDFromContext(ctx)

	// Parse query params for custom range
	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30) // Default to 30 days

	query := r.URL.Query()
	if startStr := query.Get("start_date"); startStr != "" {
		// Try parsing as yyyy-MM-dd format first
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startDate = t.UTC()
		} else if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			// Fallback to RFC3339 if yyyy-MM-dd fails
			startDate = t
		}
	}
	if endStr := query.Get("end_date"); endStr != "" {
		// Try parsing as yyyy-MM-dd format first
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			// Set to end of day for end date
			endDate = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, time.UTC)
		} else if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			// Fallback to RFC3339 if yyyy-MM-dd fails
			endDate = t
		}
	}

	activities, err := h.Repo.GetActivity(ctx, userID, startDate, endDate)
	if err != nil {
		http.Error(w, "Failed to fetch activity", http.StatusInternalServerError)
		return
	}

	var totalMinutes int
	for _, a := range activities {
		totalMinutes += a.Minutes
	}

	response := models.ActivityReport{
		TotalHours: float64(totalMinutes) / 60.0,
		DailyStats: activities,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetInteractionReport retrieves interaction report (likes, comments, follows) for the logged in user
func (h *ReportHandler) GetInteractionReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserIDFromContext(ctx)

	// Parse query params for custom range
	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30) // Default to 30 days

	query := r.URL.Query()
	if startStr := query.Get("start_date"); startStr != "" {
		// Try parsing as yyyy-MM-dd format first
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startDate = t.UTC()
		} else if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			// Fallback to RFC3339 if yyyy-MM-dd fails
			startDate = t
		}
	}
	if endStr := query.Get("end_date"); endStr != "" {
		// Try parsing as yyyy-MM-dd format first
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			// Set to end of day for end date
			endDate = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, time.UTC)
		} else if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			// Fallback to RFC3339 if yyyy-MM-dd fails
			endDate = t
		}
	}

	interactions, err := h.Repo.GetInteractionsReceived(ctx, userID, startDate, endDate)
	if err != nil {
		http.Error(w, "Failed to fetch interactions", http.StatusInternalServerError)
		return
	}

	var totalLikes, totalComments, totalFollows, totalPosts int
	for _, i := range interactions {
		totalLikes += i.Likes
		totalComments += i.Comments
		totalFollows += i.Follows
		totalPosts += i.Posts
	}

	response := models.InteractionReport{
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalFollows:  totalFollows,
		TotalPosts:    totalPosts,
		DailyStats:    interactions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetInteractionMadeReport retrieves interaction report (likes given, comments posted, follows initiated) for the logged in user
func (h *ReportHandler) GetInteractionMadeReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserIDFromContext(ctx)

	// Parse query params for custom range
	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30) // Default to 30 days

	query := r.URL.Query()
	if startStr := query.Get("start_date"); startStr != "" {
		// Try parsing as yyyy-MM-dd format first
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startDate = t.UTC()
		} else if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			// Fallback to RFC3339 if yyyy-MM-dd fails
			startDate = t
		}
	}
	if endStr := query.Get("end_date"); endStr != "" {
		// Try parsing as yyyy-MM-dd format first
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			// Set to end of day for end date
			endDate = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, time.UTC)
		} else if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			// Fallback to RFC3339 if yyyy-MM-dd fails
			endDate = t
		}
	}

	interactions, err := h.Repo.GetInteractionsMade(ctx, userID, startDate, endDate)
	if err != nil {
		http.Error(w, "Failed to fetch interactions", http.StatusInternalServerError)
		return
	}

	var totalLikes, totalComments, totalFollows, totalPosts int
	for _, i := range interactions {
		totalLikes += i.Likes
		totalComments += i.Comments
		totalFollows += i.Follows
		totalPosts += i.Posts
	}

	response := models.InteractionReport{
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalFollows:  totalFollows,
		TotalPosts:    totalPosts,
		DailyStats:    interactions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
