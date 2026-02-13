package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/service"
	"federated-social/backend/middleware"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationHandler struct {
	notificationService *service.NotificationService
}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{
		notificationService: service.NewNotificationService(),
	}
}

// GetNotifications handles GET /api/notifications
// Retrieves a paginated list of notifications for the authenticated user.
// Uses `limit` query parameter to control page size (default 50).
func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	// Get limit from query params (default 50)
	limit := int64(50)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = parsedLimit
		}
	}

	notifications, err := h.notificationService.GetNotifications(r.Context(), userID, limit)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Notifications retrieved successfully", notifications, http.StatusOK)
}

// MarkAsRead handles PUT /api/notifications/:id/read
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	notificationID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	if err := h.notificationService.MarkAsRead(r.Context(), notificationID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Notification marked as read", nil, http.StatusOK)
}

// MarkAllAsRead handles PUT /api/notifications/read-all
func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	if err := h.notificationService.MarkAllAsRead(r.Context(), userID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "All notifications marked as read", nil, http.StatusOK)
}

// GetUnreadCount handles GET /api/notifications/unread/count
func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	count, err := h.notificationService.GetUnreadCount(r.Context(), userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Unread count retrieved successfully", map[string]int64{"count": count}, http.StatusOK)
}

// CreateRemoteNotification handles POST /api/notifications/remote
// This endpoint is used by other communities to create notifications (e.g. for cross-community messages).
func (h *NotificationHandler) CreateRemoteNotification(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateRemoteNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	relatedUserID, err := primitive.ObjectIDFromHex(req.RelatedUserID)
	if err != nil {
		respondError(w, "Invalid related user ID", http.StatusBadRequest)
		return
	}

	var relatedEntityID primitive.ObjectID
	if req.RelatedEntityID != "" {
		relatedEntityID, _ = primitive.ObjectIDFromHex(req.RelatedEntityID)
	}

	if err := h.notificationService.CreateNotification(r.Context(), userID, relatedUserID, req.Type, relatedEntityID, req.Content, req.RelatedUserName, req.RelatedUserAvatar); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Remote notification created", nil, http.StatusCreated)
}
