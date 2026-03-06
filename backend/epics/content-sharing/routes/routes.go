package routes

import (
	"federated-social/backend/epics/content-sharing/handlers"
	"federated-social/backend/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

// RegisterContentSharingRoutes registers all content-sharing related routes
// This includes methods for:
// - Posts: Create, feed, user posts, deletion
// - Interactions: Like, unlike, comment, save, report
// - Follows: Follow, unfollow, get followers/following
// - Notifications: Get, mark read
// - Search: User search
func RegisterContentSharingRoutes(router *mux.Router) {
	postHandler := handlers.NewPostHandler()
	followHandler := handlers.NewFollowHandler()
	notificationHandler := handlers.NewNotificationHandler()
	searchHandler := handlers.NewSearchHandler()
	storyHandler := handlers.NewStoryHandler()

	// Story routes
	router.Handle("/api/stories", middleware.AuthMiddleware(http.HandlerFunc(storyHandler.CreateStory))).Methods("POST", "OPTIONS")
	router.Handle("/api/stories", middleware.OptionalAuth(http.HandlerFunc(storyHandler.GetActiveStories))).Methods("GET", "OPTIONS")
	// /viewed must be registered before /{id} to avoid the wildcard swallowing it
	router.Handle("/api/stories/viewed", middleware.AuthMiddleware(http.HandlerFunc(storyHandler.GetViewedStoryIDs))).Methods("GET", "OPTIONS")
	router.Handle("/api/stories/{id}", middleware.AuthMiddleware(http.HandlerFunc(storyHandler.DeleteStory))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/stories/{id}/view", middleware.AuthMiddleware(http.HandlerFunc(storyHandler.MarkViewed))).Methods("POST", "OPTIONS")
	router.Handle("/api/stories/{id}/like", middleware.AuthMiddleware(http.HandlerFunc(storyHandler.LikeStory))).Methods("POST", "OPTIONS")
	router.Handle("/api/stories/{id}/like", middleware.AuthMiddleware(http.HandlerFunc(storyHandler.UnlikeStory))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/stories/{id}/likes", middleware.AuthMiddleware(http.HandlerFunc(storyHandler.GetStoryLikers))).Methods("GET", "OPTIONS")

	// Post routes
	// All require authentication to ensure user accountability
	router.Handle("/api/posts", middleware.AuthMiddleware(http.HandlerFunc(postHandler.CreatePost))).Methods("POST", "OPTIONS")
	router.Handle("/api/feed", middleware.AuthMiddleware(http.HandlerFunc(postHandler.GetFeed))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/posts", middleware.OptionalAuth(http.HandlerFunc(postHandler.GetUserPosts))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/likes", middleware.OptionalAuth(http.HandlerFunc(postHandler.GetUserLikedPosts))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/comments", middleware.OptionalAuth(http.HandlerFunc(postHandler.GetUserCommentedPosts))).Methods("GET", "OPTIONS")

	// Post Actions
	router.Handle("/api/posts/{id}/like", middleware.AuthMiddleware(http.HandlerFunc(postHandler.LikePost))).Methods("POST", "OPTIONS")
	router.Handle("/api/posts/{id}/like", middleware.AuthMiddleware(http.HandlerFunc(postHandler.UnlikePost))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/posts/{id}/comments", middleware.AuthMiddleware(http.HandlerFunc(postHandler.CreateComment))).Methods("POST", "OPTIONS")
	router.Handle("/api/posts/{id}/comments", middleware.OptionalAuth(http.HandlerFunc(postHandler.GetComments))).Methods("GET", "OPTIONS")
	router.Handle("/api/comments/{id}", middleware.AuthMiddleware(http.HandlerFunc(postHandler.DeleteComment))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/posts/{id}/likers", middleware.OptionalAuth(http.HandlerFunc(postHandler.GetPostLikers))).Methods("GET", "OPTIONS")

	// Saved Posts
	router.Handle("/api/posts/saved", middleware.AuthMiddleware(http.HandlerFunc(postHandler.GetSavedPosts))).Methods("GET", "OPTIONS")
	router.Handle("/api/posts/{id}/save", middleware.AuthMiddleware(http.HandlerFunc(postHandler.SavePost))).Methods("POST", "OPTIONS")
	router.Handle("/api/posts/{id}/save", middleware.AuthMiddleware(http.HandlerFunc(postHandler.UnsavePost))).Methods("DELETE", "OPTIONS")

	// Individual Post management
	router.Handle("/api/posts/{id}", middleware.OptionalAuth(http.HandlerFunc(postHandler.GetPostByID))).Methods("GET", "OPTIONS")
	router.Handle("/api/posts/{id}", middleware.AuthMiddleware(http.HandlerFunc(postHandler.DeletePost))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/posts/{id}/report", middleware.AuthMiddleware(http.HandlerFunc(postHandler.ReportPost))).Methods("POST", "OPTIONS")
	router.Handle("/api/posts/{id}/interact", middleware.AuthMiddleware(http.HandlerFunc(postHandler.InteractPost))).Methods("POST", "OPTIONS")

	// Follow routes
	router.Handle("/api/users/{id}/follow", middleware.AuthMiddleware(http.HandlerFunc(followHandler.Follow))).Methods("POST", "OPTIONS")
	router.Handle("/api/users/{id}/unfollow", middleware.AuthMiddleware(http.HandlerFunc(followHandler.Unfollow))).Methods("DELETE", "OPTIONS")
	router.Handle("/api/users/{id}/followers", middleware.OptionalAuth(http.HandlerFunc(followHandler.GetFollowers))).Methods("GET", "OPTIONS")
	router.Handle("/api/users/{id}/following", middleware.OptionalAuth(http.HandlerFunc(followHandler.GetFollowing))).Methods("GET", "OPTIONS")

	// Notification routes
	router.Handle("/api/notifications", middleware.AuthMiddleware(http.HandlerFunc(notificationHandler.GetNotifications))).Methods("GET", "OPTIONS")
	router.Handle("/api/notifications/read-all", middleware.AuthMiddleware(http.HandlerFunc(notificationHandler.MarkAllAsRead))).Methods("PUT", "OPTIONS")
	router.Handle("/api/notifications/{id}/read", middleware.AuthMiddleware(http.HandlerFunc(notificationHandler.MarkAsRead))).Methods("PUT", "OPTIONS")
	router.Handle("/api/notifications/unread/count", middleware.AuthMiddleware(http.HandlerFunc(notificationHandler.GetUnreadCount))).Methods("GET", "OPTIONS")
	router.Handle("/api/notifications/remote", http.HandlerFunc(notificationHandler.CreateRemoteNotification)).Methods("POST", "OPTIONS")

	// Search routes
	router.Handle("/api/users/search", middleware.OptionalAuth(http.HandlerFunc(searchHandler.SearchUsers))).Methods("GET", "OPTIONS")
}
