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
	router.HandleFunc("/api/auth/signup", authHandler.Signup).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")

	// Protected routes (authentication required)
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	// Auth routes
	protected.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST", "OPTIONS")
	protected.HandleFunc("/auth/change-password", authHandler.ChangePassword).Methods("POST", "OPTIONS")

	// Profile routes
	protected.HandleFunc("/profile/me", profileHandler.GetMyProfile).Methods("GET", "OPTIONS")
	protected.HandleFunc("/profile/me", profileHandler.UpdateProfile).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/profile/me/deactivate", profileHandler.DeactivateAccount).Methods("POST", "OPTIONS")
	protected.HandleFunc("/profile/me/activity", profileHandler.GetActivity).Methods("GET", "OPTIONS")

	// Public profile view (with optional auth for visibility check)
	router.HandleFunc("/api/profile/{id}", profileHandler.GetProfile).Methods("GET", "OPTIONS")
}
