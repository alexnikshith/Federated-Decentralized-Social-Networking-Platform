package routes

import (
	"federated-social/backend/epics/federation/handlers"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterFederationRoutes registers all federation-related routes
func RegisterFederationRoutes(router *mux.Router) {
	handler := handlers.NewFederationHandler()

	// Instance discovery (public)
	router.HandleFunc("/.well-known/instance-info", handler.GetInstanceInfo).Methods("GET", "OPTIONS")

	// Federation inbox (public, but with instance validation inside handler)
	router.HandleFunc("/federation/inbox", handler.ReceiveActivity).Methods("POST", "OPTIONS")

	// Get list of trusted instances (public)
	router.HandleFunc("/api/federation/instances", handler.GetTrustedInstances).Methods("GET", "OPTIONS")

	// Resolve remote user (protected)
	router.Handle("/api/federation/users/resolve", middleware.AuthMiddleware(http.HandlerFunc(handler.ResolveUser))).Methods("POST", "OPTIONS")

	// Follow remote user (protected)
	router.Handle("/api/federation/users/follow", middleware.AuthMiddleware(http.HandlerFunc(handler.FollowRemoteUser))).Methods("POST", "OPTIONS")
}
