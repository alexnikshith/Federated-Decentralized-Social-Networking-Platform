package routes

import (
	"federated-social/backend/epics/safety/handlers"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterSafetyRoutes registers routes for the safety module
func RegisterSafetyRoutes(router *mux.Router) {
	blockHandler := handlers.NewBlockHandler()

	// Use specific routes directly on the main router to avoid conflicts with other modules using /api/users prefix
	router.Handle("/api/users/{id}/block", middleware.AuthMiddleware(http.HandlerFunc(blockHandler.BlockUser))).Methods("POST", "OPTIONS")
	router.Handle("/api/users/{id}/block", middleware.AuthMiddleware(http.HandlerFunc(blockHandler.UnblockUser))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/users/blocked", middleware.AuthMiddleware(http.HandlerFunc(blockHandler.GetBlockedUsers))).Methods("GET", "OPTIONS")
}
