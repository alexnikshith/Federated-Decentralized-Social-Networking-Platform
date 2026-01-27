package handlers

import (
	"encoding/json"
	identityDto "federated-social/backend/epics/identity/dto"
	"net/http"
)

// Helper functions for consistent API responses

func respondJSON(w http.ResponseWriter, data interface{}, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, message string, statusCode int) {
	response := identityDto.ErrorResponse{
		Error:   "error",
		Message: message,
	}
	respondJSON(w, response, statusCode)
}

func respondSuccess(w http.ResponseWriter, message string, data interface{}, statusCode int) {
	response := identityDto.SuccessResponse{
		Success: true,
		Message: message,
		Data:    data,
	}
	respondJSON(w, response, statusCode)
}
