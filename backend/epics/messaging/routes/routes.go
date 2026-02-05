package routes

import (
	"federated-social/backend/epics/messaging/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

func RegisterMessagingRoutes(router *mux.Router) {
	h := handlers.NewMessageHandler()
	mh := handlers.NewMediaHandler()

	// Public media access (must be registered before the /api/messages subrouter)
	router.HandleFunc("/api/messages/media/{id}", mh.DownloadMedia).Methods("GET")

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
