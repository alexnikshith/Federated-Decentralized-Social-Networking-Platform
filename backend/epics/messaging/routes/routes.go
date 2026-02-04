package routes

import (
	"federated-social/backend/epics/messaging/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

func RegisterMessagingRoutes(router *mux.Router) {
	h := handlers.NewMessageHandler()

	api := router.PathPrefix("/api/messages").Subrouter()
	api.Use(middleware.AuthMiddleware)

	api.HandleFunc("", h.SendMessage).Methods("POST")
	api.HandleFunc("/conversations", h.GetConversations).Methods("GET")
	api.HandleFunc("/conversations/{id}", h.GetConversationMessages).Methods("GET")
}
