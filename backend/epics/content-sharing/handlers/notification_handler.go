package handlers

import (
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
