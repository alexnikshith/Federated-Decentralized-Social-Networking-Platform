package routes

import (
	"federated-social/backend/epics/content-sharing/handlers"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterContentSharingRoutes registers all content-sharing related routes
func RegisterContentSharingRoutes(router *mux.Router) {
	postHandler := handlers.NewPostHandler()
	followHandler := handlers.NewFollowHandler()
	notificationHandler := handlers.NewNotificationHandler()
	searchHandler := handlers.NewSearchHandler()

	// Post routes
	router.Handle("/api/posts", middleware.AuthMiddleware(http.HandlerFunc(postHandler.CreatePost))).Methods("POST", "OPTIONS")
	router.Handle("/api/feed", middleware.AuthMiddleware(http.HandlerFunc(postHandler.GetFeed))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/posts", middleware.AuthMiddleware(http.HandlerFunc(postHandler.GetUserPosts))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/likes", middleware.AuthMiddleware(http.HandlerFunc(postHandler.GetUserLikedPosts))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/comments", middleware.AuthMiddleware(http.HandlerFunc(postHandler.GetUserCommentedPosts))).Methods("GET", "OPTIONS")
	router.Handle("/api/posts/{id}/like", middleware.AuthMiddleware(http.HandlerFunc(postHandler.LikePost))).Methods("POST", "OPTIONS")
	router.Handle("/api/posts/{id}/like", middleware.AuthMiddleware(http.HandlerFunc(postHandler.UnlikePost))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/posts/{id}/comments", middleware.AuthMiddleware(http.HandlerFunc(postHandler.CreateComment))).Methods("POST", "OPTIONS")
	router.Handle("/api/posts/{id}/comments", middleware.AuthMiddleware(http.HandlerFunc(postHandler.GetComments))).Methods("GET", "OPTIONS")
	router.Handle("/api/posts/{id}", middleware.AuthMiddleware(http.HandlerFunc(postHandler.DeletePost))).Methods("DELETE", "OPTIONS")

	// Follow routes
	router.Handle("/api/users/{id}/follow", middleware.AuthMiddleware(http.HandlerFunc(followHandler.Follow))).Methods("POST", "OPTIONS")
	router.Handle("/api/users/{id}/unfollow", middleware.AuthMiddleware(http.HandlerFunc(followHandler.Unfollow))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/users/{id}/followers", middleware.AuthMiddleware(http.HandlerFunc(followHandler.GetFollowers))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/following", middleware.AuthMiddleware(http.HandlerFunc(followHandler.GetFollowing))).Methods("GET", "OPTIONS")

	// Notification routes
	router.Handle("/api/notifications", middleware.AuthMiddleware(http.HandlerFunc(notificationHandler.GetNotifications))).Methods("GET", "OPTIONS")
	router.Handle("/api/notifications/{id}/read", middleware.AuthMiddleware(http.HandlerFunc(notificationHandler.MarkAsRead))).Methods("PUT", "OPTIONS")
	router.Handle("/api/notifications/unread/count", middleware.AuthMiddleware(http.HandlerFunc(notificationHandler.GetUnreadCount))).Methods("GET", "OPTIONS")

	// Search routes
	router.Handle("/api/users/search", middleware.AuthMiddleware(http.HandlerFunc(searchHandler.SearchUsers))).Methods("GET", "OPTIONS")
}
