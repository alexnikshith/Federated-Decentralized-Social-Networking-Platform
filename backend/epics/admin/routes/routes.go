package routes

import (
	"federated-social/backend/epics/admin/handlers"
	"federated-social/backend/middleware"

	safetyService "federated-social/backend/epics/safety/service"

	"github.com/gorilla/mux"
)

// RegisterAdminRoutes registers administrative routes
// All routes are protected by Authentication AND Admin Authorization middleware.
// Includes endpoints for dashboard stats, user management (list, status, role, delete),
// post moderation, and handling user reports.
func RegisterAdminRoutes(router *mux.Router, enforcement *safetyService.EnforcementService) {
	h := handlers.NewAdminHandler(enforcement)

	adminSubrouter := router.PathPrefix("/api/admin").Subrouter()
	adminSubrouter.Use(middleware.AuthMiddleware)
	adminSubrouter.Use(middleware.AdminMiddleware) // CRITICAL: Enforce admin role

	// Dashboard Stats
	adminSubrouter.HandleFunc("/stats", h.GetStats).Methods("GET", "OPTIONS")
	adminSubrouter.HandleFunc("/traffic", h.GetTraffic).Methods("GET", "OPTIONS")

	// User Management
	adminSubrouter.HandleFunc("/users", h.ListUsers).Methods("GET", "OPTIONS")
	adminSubrouter.HandleFunc("/users/status", h.ToggleUserStatus).Methods("POST", "OPTIONS")
	adminSubrouter.HandleFunc("/users/role", h.UpdateUserRole).Methods("POST", "OPTIONS")
	adminSubrouter.HandleFunc("/users", h.DeleteUser).Methods("DELETE", "OPTIONS")

	// Content Moderation
	adminSubrouter.HandleFunc("/posts", h.DeletePost).Methods("DELETE", "OPTIONS")

	// Report Management
	adminSubrouter.HandleFunc("/reports", h.ListReports).Methods("GET", "OPTIONS")
	adminSubrouter.HandleFunc("/reports/resolve", h.ResolveReport).Methods("DELETE", "OPTIONS")
}
