package routes

import (
	"federated-social/backend/epics/safety/handlers"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterSafetyRoutes registers routes for the safety module
// Handles user blocking and unblocking features.
func RegisterSafetyRoutes(router *mux.Router, moderationHandler *handlers.ModerationHandler) {
	blockHandler := handlers.NewBlockHandler()

	// Public Guidelines
	router.HandleFunc("/api/moderation/guidelines", moderationHandler.GetGuidelines).Methods("GET", "OPTIONS")

	// User Moderation Logs
	router.Handle("/api/moderation/my-logs", middleware.AuthMiddleware(http.HandlerFunc(moderationHandler.GetMyLogs))).Methods("GET", "OPTIONS")

	// Admin Moderation (Guideline CRUD)
	router.Handle("/api/admin/moderation/guidelines", middleware.AuthMiddleware(middleware.AdminMiddleware(http.HandlerFunc(moderationHandler.CreateGuideline)))).Methods("POST", "OPTIONS")
	router.Handle("/api/admin/moderation/guidelines/{id}", middleware.AuthMiddleware(middleware.AdminMiddleware(http.HandlerFunc(moderationHandler.UpdateGuideline)))).Methods("PUT", "OPTIONS")
	router.Handle("/api/admin/moderation/guidelines/{id}", middleware.AuthMiddleware(middleware.AdminMiddleware(http.HandlerFunc(moderationHandler.DeleteGuideline)))).Methods("DELETE", "OPTIONS")

	// Admin Scanner & Logs
	router.Handle("/api/admin/moderation/scan", middleware.AuthMiddleware(middleware.AdminMiddleware(http.HandlerFunc(moderationHandler.TriggerScan)))).Methods("POST", "OPTIONS")
	router.Handle("/api/admin/moderation/logs", middleware.AuthMiddleware(middleware.AdminMiddleware(http.HandlerFunc(moderationHandler.GetAllLogs)))).Methods("GET", "OPTIONS")

	// Blocking
	router.Handle("/api/users/{id}/block", middleware.AuthMiddleware(http.HandlerFunc(blockHandler.BlockUser))).Methods("POST", "OPTIONS")
	router.Handle("/api/users/{id}/block", middleware.AuthMiddleware(http.HandlerFunc(blockHandler.UnblockUser))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/users/blocked", middleware.AuthMiddleware(http.HandlerFunc(blockHandler.GetBlockedUsers))).Methods("GET", "OPTIONS")
}
