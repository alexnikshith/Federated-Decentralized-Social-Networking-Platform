package routes

import (
	"federated-social/backend/epics/identity/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

// RegisterIdentityRoutes registers all identity-related routes
func RegisterIdentityRoutes(router *mux.Router) {
	authHandler := handlers.NewAuthHandler()
	profileHandler := handlers.NewProfileHandler()

	// Public routes (no authentication required)
	router.HandleFunc("/api/auth/signup", authHandler.Signup).Methods("POST")
	router.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST")

	// Protected routes (authentication required)
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	// Auth routes
	protected.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST")
	protected.HandleFunc("/auth/change-password", authHandler.ChangePassword).Methods("POST")

	// Profile routes
	protected.HandleFunc("/profile/me", profileHandler.GetMyProfile).Methods("GET")
	protected.HandleFunc("/profile/me", profileHandler.UpdateProfile).Methods("PUT")
	protected.HandleFunc("/profile/me/deactivate", profileHandler.DeactivateAccount).Methods("POST")
	protected.HandleFunc("/profile/me/activity", profileHandler.GetActivity).Methods("GET")

	// Public profile view (with optional auth for visibility check)
	router.HandleFunc("/api/profile/{id}", profileHandler.GetProfile).Methods("GET")
}
