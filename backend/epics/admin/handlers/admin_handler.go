package handlers

import (
	"encoding/json"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	"federated-social/backend/epics/content-sharing/service"
	identityRepo "federated-social/backend/epics/identity/repository"
	messagingRepo "federated-social/backend/epics/messaging/repository"
	"federated-social/backend/pkg/email"
	"log"
	"net/http"
	"strings"

	reportRepo "federated-social/backend/epics/reports/repository"
	reportService "federated-social/backend/epics/reports/service"
	safetyService "federated-social/backend/epics/safety/service"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AdminHandler struct {
	userRepo           *identityRepo.UserRepository
	postRepo           *contentRepo.PostRepository
	storyRepo          *contentRepo.StoryRepository
	messageRepo        *messagingRepo.MessageRepository
	activityRepo       *identityRepo.ActivityRepository
	sessionRepo        *identityRepo.SessionRepository
	followRepo         *contentRepo.FollowRepository
	notificationRepo   *contentRepo.NotificationRepository
	postService        *service.PostService
	reportService      reportService.ReportService
	enforcementService *safetyService.EnforcementService
	emailSender        *email.EmailSender
}

func NewAdminHandler(enforcement *safetyService.EnforcementService) *AdminHandler {
	return &AdminHandler{
		userRepo:           identityRepo.NewUserRepository(),
		postRepo:           contentRepo.NewPostRepository(),
		storyRepo:          contentRepo.NewStoryRepository(),
		messageRepo:        messagingRepo.NewMessageRepository(),
		activityRepo:       identityRepo.NewActivityRepository(),
		sessionRepo:        identityRepo.NewSessionRepository(),
		followRepo:         contentRepo.NewFollowRepository(),
		notificationRepo:   contentRepo.NewNotificationRepository(),
		postService:        service.NewPostService(enforcement),
		reportService:      reportService.NewReportService(reportRepo.NewReportRepository()),
		enforcementService: enforcement,
		emailSender:        email.NewEmailSender(),
	}
}

type AdminStats struct {
	TotalUsers    int64 `json:"total_users"`
	TotalPosts    int64 `json:"total_posts"`
	DailyActivity int64 `json:"daily_activity"`
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	totalUsers, _ := h.userRepo.CountAll(ctx)
	totalPosts, _ := h.postRepo.CountAll(ctx)
	dailyActivity, _ := h.activityRepo.CountDailyActivity(ctx)

	stats := AdminStats{
		TotalUsers:    totalUsers,
		TotalPosts:    totalPosts,
		DailyActivity: dailyActivity,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *AdminHandler) GetTraffic(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := r.URL.Query()
	startStr := query.Get("start_date")
	endStr := query.Get("end_date")

	report, err := h.reportService.GetTrafficReport(ctx, startStr, endStr)
	if err != nil {
		http.Error(w, "Failed to fetch traffic stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	users, err := h.userRepo.FindAll(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Mask the emails
	for i := range users {
		parts := strings.Split(users[i].Email, "@")
		if len(parts) == 2 {
			local := parts[0]
			domain := parts[1]
			if len(local) > 3 {
				users[i].Email = local[:3] + "************@" + domain
			} else {
				users[i].Email = local + "************@" + domain
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// ToggleUserStatus active/deactives a user account
// If deactivating, it attempts to send an email notification with the reason.
// It also forcefully invalidates all active sessions for that user to ensure immediate lockout.
func (h *AdminHandler) ToggleUserStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"user_id"`
		Status bool   `json:"is_active"`
		Reason string `json:"reason,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	oid, _ := primitive.ObjectIDFromHex(req.UserID)

	// If deactivating, try to send email first
	if !req.Status {
		user, err := h.userRepo.FindByID(r.Context(), oid)
		if err == nil && user != nil && user.Email != "" {
			reason := req.Reason
			if reason == "" {
				reason = "Violation of Terms of Service"
			}

			// Send Synchronously (Soft Fail)
			if err := h.emailSender.SendAccountDeactivationNotification(user.Email, user.Username, reason); err != nil {
				log.Printf("WARNING: Failed to send deactivation email to %s: %v", user.Email, err)
				// We proceed with deactivation anyway
			}
		}

		// Invalidate all sessions
		h.sessionRepo.InvalidateAllUserSessions(r.Context(), oid)
	}

	update := bson.M{
		"is_active":      req.Status,
		"is_deactivated": !req.Status,
	}
	if err := h.userRepo.UpdateUser(r.Context(), oid, update); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *AdminHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Role != "user" && req.Role != "admin" {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}

	oid, _ := primitive.ObjectIDFromHex(req.UserID)
	update := bson.M{"role": req.Role}
	if err := h.userRepo.UpdateUser(r.Context(), oid, update); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Invalidate all sessions to force logout/re-login for security
	h.sessionRepo.InvalidateAllUserSessions(r.Context(), oid)

	// Send email notification
	user, err := h.userRepo.FindByID(r.Context(), oid)
	if err == nil && user != nil && user.Email != "" {
		go h.emailSender.SendAdminRoleNotification(user.Email, user.Username, req.Role)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *AdminHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Query().Get("id")
	if postID == "" {
		http.Error(w, "Post ID required", http.StatusBadRequest)
		return
	}

	oid, _ := primitive.ObjectIDFromHex(postID)
	if err := h.postRepo.DeletePost(r.Context(), oid); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("id")
	if userID == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		http.Error(w, "Invalid User ID", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// Full cascade wipe:

	// 1. Posts, Likes, Comments, Saved Posts, Reports, Interactions
	_ = h.postRepo.DeletePostsByAuthor(ctx, oid)
	_ = h.postRepo.DeleteLikesByUser(ctx, oid)
	_ = h.postRepo.DeleteCommentsByUser(ctx, oid)
	_ = h.postRepo.DeleteSavedPostsByUser(ctx, oid)
	_ = h.postRepo.DeleteReportsByUser(ctx, oid)
	_ = h.postRepo.DeleteInteractionsByUser(ctx, oid)

	// 2. Stories
	_ = h.storyRepo.DeleteStoriesByAuthor(ctx, oid)

	// 3. Messages & Conversations
	_ = h.messageRepo.DeleteConversationsByUser(ctx, oid)
	_ = h.messageRepo.DeleteMessagesByUser(ctx, oid)

	// 4. Follows
	_ = h.followRepo.DeleteAllFollows(ctx, oid)

	// 5. Notifications
	_ = h.notificationRepo.DeleteUserNotifications(ctx, oid)

	// 6. Sessions & Activity
	_ = h.sessionRepo.InvalidateAllUserSessions(ctx, oid)
	_ = h.activityRepo.DeleteUserActivity(ctx, oid)

	// 7. Finally, the User record itself
	if err := h.userRepo.DeleteUser(ctx, oid); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Admin: fully deleted user %s and all associated data", userID)
	w.WriteHeader(http.StatusOK)
}

func (h *AdminHandler) ListReports(w http.ResponseWriter, r *http.Request) {
	reports, err := h.postService.GetAllReports(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reports)
}

func (h *AdminHandler) ResolveReport(w http.ResponseWriter, r *http.Request) {
	reportID := r.URL.Query().Get("id")
	if reportID == "" {
		http.Error(w, "Report ID required", http.StatusBadRequest)
		return
	}

	oid, _ := primitive.ObjectIDFromHex(reportID)

	// 1. Get the report to find PostID
	report, err := h.postRepo.GetReportByID(r.Context(), oid)
	if err != nil {
		http.Error(w, "Report not found", http.StatusNotFound)
		return
	}

	// 2. Restore Post visibility (set status to 'active')
	if err := h.postRepo.UpdatePostStatus(r.Context(), report.PostID, "active"); err != nil {
		http.Error(w, "Failed to restore post visibility: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 3. Delete the report
	if err := h.postRepo.DeleteReport(r.Context(), oid); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
