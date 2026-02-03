package routes

import (
	"federated-social/backend/epics/admin/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

func RegisterAdminRoutes(router *mux.Router) {
	h := handlers.NewAdminHandler()

	adminSubrouter := router.PathPrefix("/api/admin").Subrouter()
	adminSubrouter.Use(middleware.AuthMiddleware)
	adminSubrouter.Use(middleware.AdminMiddleware)

	adminSubrouter.HandleFunc("/stats", h.GetStats).Methods("GET", "OPTIONS")
	adminSubrouter.HandleFunc("/users", h.ListUsers).Methods("GET", "OPTIONS")
	adminSubrouter.HandleFunc("/users/status", h.ToggleUserStatus).Methods("POST", "OPTIONS")
	adminSubrouter.HandleFunc("/users/role", h.UpdateUserRole).Methods("POST", "OPTIONS")
	adminSubrouter.HandleFunc("/posts", h.DeletePost).Methods("DELETE", "OPTIONS")
}
