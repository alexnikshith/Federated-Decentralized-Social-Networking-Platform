package handlers

import (
	"encoding/json"
	"federated-social/backend/config"
	"federated-social/backend/epics/federation/models"
	"federated-social/backend/epics/federation/service"
	"log"
	"net/http"
)

type FederationHandler struct {
	federationService *service.FederationService
}

func NewFederationHandler() *FederationHandler {
	return &FederationHandler{
		federationService: service.NewFederationService(),
	}
}

// GetInstanceInfo handles instance discovery requests
// GET /.well-known/instance-info
func (h *FederationHandler) GetInstanceInfo(w http.ResponseWriter, r *http.Request) {
	instanceInfo := map[string]interface{}{
		"instance":   config.AppConfig.InstanceName,
		"domain":     config.AppConfig.InstanceDomain,
		"federation": true,
		"inbox":      "/federation/inbox",
		"version":    "1.0",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(instanceInfo)
}

// ReceiveActivity handles incoming federation activities
// POST /federation/inbox
func (h *FederationHandler) ReceiveActivity(w http.ResponseWriter, r *http.Request) {
	var envelope models.ActivityEnvelope
	if err := json.NewDecoder(r.Body).Decode(&envelope); err != nil {
		log.Printf("Failed to decode activity: %v", err)
		http.Error(w, "Invalid activity format", http.StatusBadRequest)
		return
	}

	// Log incoming activity
	log.Printf("Received federation activity: type=%s, origin=%s, actor=%s",
		envelope.Type, envelope.Origin, envelope.Actor)

	// Handle activity asynchronously
	go func() {
		ctx := r.Context()
		if err := h.federationService.HandleIncomingActivity(ctx, &envelope); err != nil {
			log.Printf("Error handling incoming activity: %v", err)
		}
	}()

	// Return 202 Accepted immediately
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "accepted",
	})
}
