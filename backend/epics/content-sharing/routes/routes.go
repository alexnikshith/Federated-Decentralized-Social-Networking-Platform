package routes

import (
	"federated-social/backend/epics/content-sharing/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

// RegisterContentSharingRoutes registers all content-sharing related routes
func RegisterContentSharingRoutes(router *mux.Router) {
	postHandler := handlers.NewPostHandler()
	followHandler := handlers.NewFollowHandler()
	notificationHandler := handlers.NewNotificationHandler()
	searchHandler := handlers.NewSearchHandler()

	// Protected routes (authentication required)
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	// Post routes
	protected.HandleFunc("/posts", postHandler.CreatePost).Methods("POST", "OPTIONS")
	protected.HandleFunc("/feed", postHandler.GetFeed).Methods("GET", "OPTIONS")
	protected.HandleFunc("/posts/{id}/like", postHandler.LikePost).Methods("POST", "OPTIONS")
	protected.HandleFunc("/posts/{id}/like", postHandler.UnlikePost).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/posts/{id}/comments", postHandler.CreateComment).Methods("POST", "OPTIONS")
	protected.HandleFunc("/posts/{id}/comments", postHandler.GetComments).Methods("GET", "OPTIONS")
	protected.HandleFunc("/posts/{id}", postHandler.DeletePost).Methods("DELETE", "OPTIONS")

	// Follow routes
	protected.HandleFunc("/users/{id}/follow", followHandler.Follow).Methods("POST", "OPTIONS")
	protected.HandleFunc("/users/{id}/unfollow", followHandler.Unfollow).Methods("DELETE", "OPTIONS")

	// Notification routes
	protected.HandleFunc("/notifications", notificationHandler.GetNotifications).Methods("GET", "OPTIONS")
	protected.HandleFunc("/notifications/{id}/read", notificationHandler.MarkAsRead).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/notifications/unread/count", notificationHandler.GetUnreadCount).Methods("GET", "OPTIONS")

	// Search routes
	protected.HandleFunc("/users/search", searchHandler.SearchUsers).Methods("GET", "OPTIONS")
}
