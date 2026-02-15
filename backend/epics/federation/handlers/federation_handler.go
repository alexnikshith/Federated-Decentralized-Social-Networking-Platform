package handlers

import (
	"context"
	"encoding/json"
	"federated-social/backend/config"
	"federated-social/backend/epics/federation/models"
	"federated-social/backend/middleware"
	"fmt"
	"log"
	"net/http"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FederationService interface {
	HandleIncomingActivity(ctx context.Context, envelope *models.ActivityEnvelope) error
	GetTrustedInstances(ctx context.Context) ([]models.Instance, error)
	ResolveRemoteUser(ctx context.Context, handle string) (*models.RemoteUser, error)
	FollowRemoteUser(ctx context.Context, localUserID primitive.ObjectID, remoteUser *models.RemoteUser) error
	RemoveRemoteFollow(ctx context.Context, localUserID primitive.ObjectID, actorID, username, instance string) error
}

type FederationHandler struct {
	federationService FederationService
}

func NewFederationHandler(service FederationService) *FederationHandler {
	return &FederationHandler{
		federationService: service,
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
		// Use background context since request context will be cancelled when handler returns
		ctx := context.Background()
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

// GetTrustedInstances returns all trusted federated instances
// GET /api/federation/instances
func (h *FederationHandler) GetTrustedInstances(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get trusted instances from database
	instances, err := h.federationService.GetTrustedInstances(ctx)
	if err != nil {
		log.Printf("Error fetching trusted instances: %v", err)
		http.Error(w, "Failed to fetch instances", http.StatusInternalServerError)
		return
	}

	// Add local instance to the response
	localInstance := map[string]interface{}{
		"instance":    config.AppConfig.InstanceName,
		"domain":      config.AppConfig.InstanceDomain,
		"trust_level": "local",
		"is_local":    true,
	}

	// Convert instances to response format
	response := []map[string]interface{}{localInstance}
	for _, inst := range instances {
		response = append(response, map[string]interface{}{
			"instance":    inst.Domain,
			"domain":      inst.Domain,
			"trust_level": inst.TrustLevel,
			"is_local":    false,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ResolveUser finds and returns information about a remote user
// POST /api/federation/users/resolve
// Protected endpoint
func (h *FederationHandler) ResolveUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Handle string `json:"handle"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.Handle == "" {
		http.Error(w, "Handle is required", http.StatusBadRequest)
		return
	}

	remoteUser, err := h.federationService.ResolveRemoteUser(r.Context(), body.Handle)
	if err != nil {
		log.Printf("Resolve failed: %v", err)
		// Return 404 or 500 depending on error, but simple error message here
		http.Error(w, fmt.Sprintf("Failed to resolve user: %v", err), http.StatusInternalServerError)
		return
	}

	// Convert to PublicUser format for frontend compatibility
	// Map internal Docker names back to public localhost ports for frontend
	publicInstance := remoteUser.Instance
	if remoteUser.Instance == "backend2:8080" {
		publicInstance = "localhost:8081"
	} else if remoteUser.Instance == "backend:8080" {
		publicInstance = "localhost:8080"
	}

	response := map[string]interface{}{
		"id":           remoteUser.ID.Hex(),
		"username":     remoteUser.Username,
		"display_name": remoteUser.DisplayName,
		"bio":          remoteUser.Bio,
		"avatar_url":   remoteUser.AvatarURL,
		"instance":     publicInstance, // Return public domain, not internal Docker name
		"created_at":   remoteUser.CreatedAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// FollowRemoteUser initiates a follow request to a remote user
// POST /api/federation/users/follow
// Protected endpoint
func (h *FederationHandler) FollowRemoteUser(w http.ResponseWriter, r *http.Request) {
	// Parse input
	var body struct {
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.Handle == "" {
		http.Error(w, "handle is required", http.StatusBadRequest)
		return
	}

	// Detect local user
	ctx := r.Context()
	userIDVal := ctx.Value(middleware.UserIDKey)

	if userIDVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userIDStr, ok := userIDVal.(string)
	if !ok {
		http.Error(w, "Invalid user ID in context", http.StatusInternalServerError)
		return
	}

	localUserID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	// Resolve the remote user first to ensure we have latest info/object
	remoteUser, err := h.federationService.ResolveRemoteUser(ctx, body.Handle)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to resolve user before following: %v", err), http.StatusBadRequest)
		return
	}

	// Trigger follow
	if err := h.federationService.FollowRemoteUser(ctx, localUserID, remoteUser); err != nil {
		http.Error(w, fmt.Sprintf("Failed to follow user: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("Follow request sent to %s", body.Handle),
	})
}

// UnfollowRemoteUser removes a follow relationship with a remote user
// POST /api/federation/users/unfollow
// Protected endpoint
func (h *FederationHandler) UnfollowRemoteUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if body.Handle == "" {
		http.Error(w, "handle is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	userIDVal := ctx.Value(middleware.UserIDKey)
	if userIDVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userIDStr, ok := userIDVal.(string)
	if !ok {
		http.Error(w, "Invalid user ID in context", http.StatusInternalServerError)
		return
	}

	localUserID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	// Parse handle to get username and instance
	lastAtIndex := -1
	for i := 0; i < len(body.Handle); i++ {
		if body.Handle[i] == '@' {
			lastAtIndex = i
		}
	}

	if lastAtIndex == -1 || lastAtIndex == 0 || lastAtIndex == len(body.Handle)-1 {
		http.Error(w, "Invalid handle format, expected username@instance", http.StatusBadRequest)
		return
	}

	username := body.Handle[:lastAtIndex]
	instance := body.Handle[lastAtIndex+1:]

	// Construct actorID (this should match how we stored it during follow)
	actorID := fmt.Sprintf("http://%s/users/%s", instance, username)

	if err := h.federationService.RemoveRemoteFollow(ctx, localUserID, actorID, username, instance); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unfollow user: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("Unfollowed %s", body.Handle),
	})
}
