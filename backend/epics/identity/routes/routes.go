package routes

import (
	"federated-social/backend/epics/identity/handlers"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterIdentityRoutes registers all identity-related routes
func RegisterIdentityRoutes(router *mux.Router) {
	authHandler := handlers.NewAuthHandler()
	profileHandler := handlers.NewProfileHandler()

	// Public routes (no authentication required)
	router.HandleFunc("/api/auth/signup", authHandler.Signup).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")

	// Auth routes (protected)
	router.Handle("/api/auth/logout", middleware.AuthMiddleware(http.HandlerFunc(authHandler.Logout))).Methods("POST", "OPTIONS")
	router.Handle("/api/auth/change-password", middleware.AuthMiddleware(http.HandlerFunc(authHandler.ChangePassword))).Methods("POST", "OPTIONS")

	// Profile routes (protected)
	router.Handle("/api/profile/me", middleware.AuthMiddleware(http.HandlerFunc(profileHandler.GetMyProfile))).Methods("GET", "OPTIONS")
	router.Handle("/api/profile/me", middleware.AuthMiddleware(http.HandlerFunc(profileHandler.UpdateProfile))).Methods("PUT", "OPTIONS")
	router.Handle("/api/profile/me/deactivate", middleware.AuthMiddleware(http.HandlerFunc(profileHandler.DeactivateAccount))).Methods("POST", "OPTIONS")
	router.Handle("/api/profile/me/activity", middleware.AuthMiddleware(http.HandlerFunc(profileHandler.GetActivity))).Methods("GET", "OPTIONS")

	// Public profile view
	router.HandleFunc("/api/profile/{id}", profileHandler.GetProfile).Methods("GET", "OPTIONS")
}
