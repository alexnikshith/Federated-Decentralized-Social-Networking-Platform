package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/safety/models"
	"federated-social/backend/epics/safety/repository"
	"federated-social/backend/epics/safety/service"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ModerationHandler struct {
	repo        *repository.ModerationRepository
	enforcement *service.EnforcementService
}

func NewModerationHandler(repo *repository.ModerationRepository, enforcement *service.EnforcementService) *ModerationHandler {
	return &ModerationHandler{
		repo:        repo,
		enforcement: enforcement,
	}
}

// GetGuidelines handles GET /api/moderation/guidelines
func (h *ModerationHandler) GetGuidelines(w http.ResponseWriter, r *http.Request) {
	guidelines, err := h.repo.GetActiveGuidelines(r.Context())
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondSuccess(w, "Guidelines retrieved", guidelines, http.StatusOK)
}

// CreateGuideline handles POST /api/admin/moderation/guidelines
func (h *ModerationHandler) CreateGuideline(w http.ResponseWriter, r *http.Request) {
	var g models.CommunityGuideline
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.repo.CreateGuideline(r.Context(), &g); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondSuccess(w, "Guideline created", g, http.StatusCreated)
}

// UpdateGuideline handles PUT /api/admin/moderation/guidelines/{id}
func (h *ModerationHandler) UpdateGuideline(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var g models.CommunityGuideline
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	g.ID = id

	if err := h.repo.UpdateGuideline(r.Context(), &g); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondSuccess(w, "Guideline updated", g, http.StatusOK)
}

// DeleteGuideline handles DELETE /api/admin/moderation/guidelines/{id}
func (h *ModerationHandler) DeleteGuideline(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.DeleteGuideline(r.Context(), id); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondSuccess(w, "Guideline deleted", nil, http.StatusOK)
}

// TriggerScan handles POST /api/admin/moderation/scan
func (h *ModerationHandler) TriggerScan(w http.ResponseWriter, r *http.Request) {
	err := h.enforcement.RunRetroactiveScan(r.Context())
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondSuccess(w, "Retroactive scan triggered", nil, http.StatusOK)
}

// GetMyLogs handles GET /api/moderation/my-logs
func (h *ModerationHandler) GetMyLogs(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		respondError(w, "Invalid authenticated user ID", http.StatusUnauthorized)
		return
	}

	logs, err := h.repo.GetLogsByUserID(r.Context(), userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.enforcement.EnrichModerationLogs(r.Context(), logs)
	respondSuccess(w, "Moderation logs retrieved", logs, http.StatusOK)
}

// GetAllLogs handles GET /api/admin/moderation/logs
func (h *ModerationHandler) GetAllLogs(w http.ResponseWriter, r *http.Request) {
	logs, err := h.repo.GetAllLogs(r.Context(), 100)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	h.enforcement.EnrichModerationLogs(r.Context(), logs)
	respondSuccess(w, "All moderation logs retrieved", logs, http.StatusOK)
}
