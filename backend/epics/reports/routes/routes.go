package routes

import (
	"federated-social/backend/epics/reports/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

// RegisterReportRoutes registers routes for user activity and reporting
// Includes endpoints for:
// - Activity tracking (heartbeat)
// - Activity reports (daily stats)
// - Interaction reports (likes, comments, etc.)
// - User reporting (safety)
// - Admin view of reports
func RegisterReportRoutes(router *mux.Router) {
	handler := handlers.NewReportHandler()

	s := router.PathPrefix("/api/reports").Subrouter()
	s.Use(middleware.AuthMiddleware)

	s.HandleFunc("/heartbeat", handler.Heartbeat).Methods("POST")
	s.HandleFunc("/activity", handler.GetReport).Methods("GET")
	s.HandleFunc("/interactions", handler.GetInteractionReport).Methods("GET")
	s.HandleFunc("/interactions-made", handler.GetInteractionMadeReport).Methods("GET")
	s.HandleFunc("/user", handler.SubmitUserReport).Methods("POST")
	s.HandleFunc("/admin/list", handler.GetAdminReports).Methods("GET") // Should ideally be protected by admin middleware
}
