package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/messaging/dto"
	"federated-social/backend/epics/messaging/service"
	"federated-social/backend/middleware"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageHandler struct {
	service *service.MessageService
}

func NewMessageHandler() *MessageHandler {
	return &MessageHandler{
		service: service.NewMessageService(),
	}
}

func (h *MessageHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	var req dto.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	msg, err := h.service.SendMessage(r.Context(), userID, req)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Message sent successfully", msg, http.StatusCreated)
}

func (h *MessageHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	convs, err := h.service.GetConversations(r.Context(), userID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Conversations retrieved successfully", convs, http.StatusOK)
}

func (h *MessageHandler) GetConversationMessages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	convID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid conversation ID", http.StatusBadRequest)
		return
	}

	limit := int64(50)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = parsedLimit
		}
	}

	msgs, err := h.service.GetMessages(r.Context(), convID, limit)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Messages retrieved successfully", msgs, http.StatusOK)
}
