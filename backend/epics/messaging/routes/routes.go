package routes

import (
	"federated-social/backend/epics/messaging/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

// RegisterMessagingRoutes registers all messaging-related routes
// Includes endpoints for:
// - Message sending and deletion
// - Conversation management (list, read, delete)
// - Media upload and download
// - Unread counts
func RegisterMessagingRoutes(router *mux.Router) {
	h := handlers.NewMessageHandler()
	mh := handlers.NewMediaHandler()

	// Public media access (must be registered before the /api/messages subrouter)
	// This allows loading images without checking the Auth header explicitly (browser request)
	router.HandleFunc("/api/messages/media/{id}", mh.DownloadMedia).Methods("GET")
	router.HandleFunc("/api/messages/remote", h.ReceiveRemoteMessage).Methods("POST", "OPTIONS")

	api := router.PathPrefix("/api/messages").Subrouter()
	api.Use(middleware.AuthMiddleware)

	api.HandleFunc("", h.SendMessage).Methods("POST")
	api.HandleFunc("/conversations", h.GetConversations).Methods("GET")
	api.HandleFunc("/conversations/{id}", h.GetConversationMessages).Methods("GET")
	api.HandleFunc("/conversations/{id}", h.DeleteConversation).Methods("DELETE")
	api.HandleFunc("/{id}", h.DeleteMessage).Methods("DELETE")
	api.HandleFunc("/upload", mh.UploadMedia).Methods("POST")
	api.HandleFunc("/unread-count", h.GetUnreadCount).Methods("GET")
	api.HandleFunc("/conversations/{id}/read", h.MarkConversationAsRead).Methods("POST")
}
