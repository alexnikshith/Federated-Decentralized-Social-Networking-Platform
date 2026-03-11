package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/reports/repository"
	"federated-social/backend/epics/reports/service"
	"federated-social/backend/middleware"
	"net/http"
)

type ReportHandler struct {
	Service service.ReportService
}

func NewReportHandler() *ReportHandler {
	repo := repository.NewReportRepository()
	svc := service.NewReportService(repo)
	return &ReportHandler{
		Service: svc,
	}
}

// Heartbeat handles POST /api/reports/heartbeat
// Records user activity for the current day. Called periodically by the frontend.
func (h *ReportHandler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserIDFromContext(ctx)

	// Since middleware returns ObjectID, convert to Hex string for Service
	if err := h.Service.RecordActivity(ctx, userID.Hex()); err != nil {
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

	query := r.URL.Query()
	startStr := query.Get("start_date")
	endStr := query.Get("end_date")

	report, err := h.Service.GetUserActivityReport(ctx, userID.Hex(), startStr, endStr)
	if err != nil {
		http.Error(w, "Failed to fetch activity", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// SubmitUserReport handles user reporting
func (h *ReportHandler) SubmitUserReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	reporterID := middleware.GetUserIDFromContext(ctx)

	var req service.SubmitReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.Service.SubmitUserReport(ctx, reporterID.Hex(), req); err != nil {
		if err.Error() == "cannot report yourself" {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else if err.Error() == "invalid reported user ID" {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "Failed to submit report", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Report submitted successfully"})
}

// GetAdminReports retrieves all reports
func (h *ReportHandler) GetAdminReports(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	reports, err := h.Service.GetAdminReports(ctx)
	if err != nil {
		http.Error(w, "Failed to fetch reports", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reports)
}

// GetInteractionReport retrieves interaction report (likes, comments, follows) for the logged in user
func (h *ReportHandler) GetInteractionReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserIDFromContext(ctx)

	query := r.URL.Query()
	startStr := query.Get("start_date")
	endStr := query.Get("end_date")

	report, err := h.Service.GetInteractionReport(ctx, userID.Hex(), startStr, endStr)
	if err != nil {
		http.Error(w, "Failed to fetch interactions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// GetInteractionMadeReport retrieves interaction report (likes given, comments posted, follows initiated) for the logged in user
func (h *ReportHandler) GetInteractionMadeReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserIDFromContext(ctx)

	query := r.URL.Query()
	startStr := query.Get("start_date")
	endStr := query.Get("end_date")

	report, err := h.Service.GetInteractionMadeReport(ctx, userID.Hex(), startStr, endStr)
	if err != nil {
		http.Error(w, "Failed to fetch interactions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// ResolveReport handles DELETE /api/reports/admin/resolve?id=...
func (h *ReportHandler) ResolveReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	reportID := r.URL.Query().Get("id")
	if reportID == "" {
		http.Error(w, "Report ID required", http.StatusBadRequest)
		return
	}

	if err := h.Service.ResolveReport(ctx, reportID); err != nil {
		http.Error(w, "Failed to resolve report: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Report resolved successfully"})
}
