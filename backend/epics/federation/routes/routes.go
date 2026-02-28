package routes

import (
	"federated-social/backend/config"
	"federated-social/backend/epics/federation/handlers"
	"federated-social/backend/epics/federation/service"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterFederationRoutes registers all federation-related routes
func RegisterFederationRoutes(router *mux.Router) {
	svc := service.NewFederationService()
	handler := handlers.NewFederationHandler(svc)

	// -------------------------------------------------------------------------
	// Existing internal federation routes (Docker-to-Docker) — UNTOUCHED
	// -------------------------------------------------------------------------

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

	// Unfollow remote user (protected)
	router.Handle("/api/federation/users/unfollow", middleware.AuthMiddleware(http.HandlerFunc(handler.UnfollowRemoteUser))).Methods("POST", "OPTIONS")

	// -------------------------------------------------------------------------
	// ActivityPub / Mastodon routes — only registered when enabled
	// -------------------------------------------------------------------------
	if config.AppConfig != nil && config.AppConfig.ActivityPubEnabled {
		apHandler := handlers.NewActivityPubHandler(svc)

		// Part 1: WebFinger — Mastodon calls this to find a user
		router.HandleFunc("/.well-known/webfinger", apHandler.GetWebFinger).Methods("GET", "OPTIONS")

		// Part 2: Actor endpoint — returns the ActivityPub Person JSON
		router.HandleFunc("/users/{username}", apHandler.GetActor).Methods("GET", "OPTIONS")

		// Outbox stub — required by AP spec (Mastodon checks it exists)
		router.HandleFunc("/users/{username}/outbox", apHandler.GetOutbox).Methods("GET", "OPTIONS")

		// Part 5: Per-user AP inbox
		router.HandleFunc("/users/{username}/inbox", apHandler.ReceiveAPActivity).Methods("POST", "OPTIONS")

		// Part 5: Shared AP inbox (for Mastodon shared-inbox delivery)
		router.HandleFunc("/ap/inbox", apHandler.ReceiveAPActivity).Methods("POST", "OPTIONS")

		// Part 3: Follow a remote Mastodon handle (protected)
		router.Handle("/api/activitypub/follow",
			middleware.AuthMiddleware(http.HandlerFunc(apHandler.FollowMastodonHandle))).Methods("POST", "OPTIONS")
	}
}
