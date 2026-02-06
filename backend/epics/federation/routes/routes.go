package routes

import (
	"federated-social/backend/epics/federation/handlers"

	"github.com/gorilla/mux"
)

// RegisterFederationRoutes registers all federation-related routes
func RegisterFederationRoutes(router *mux.Router) {
	handler := handlers.NewFederationHandler()

	// Instance discovery (public)
	router.HandleFunc("/.well-known/instance-info", handler.GetInstanceInfo).Methods("GET", "OPTIONS")

	// Federation inbox (public, but with instance validation inside handler)
	router.HandleFunc("/federation/inbox", handler.ReceiveActivity).Methods("POST", "OPTIONS")
}
