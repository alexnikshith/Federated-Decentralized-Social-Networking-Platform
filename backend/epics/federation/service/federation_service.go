package service

import (
	"bytes"
	"context"
	"encoding/json"
	"federated-social/backend/config"
	contentModels "federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/federation/models"
	"federated-social/backend/epics/federation/repository"
	identityModels "federated-social/backend/epics/identity/models"
	"fmt"
	"log"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FederationService struct {
	instanceRepo   *repository.InstanceRepository
	remoteUserRepo *repository.RemoteUserRepository
	remotePostRepo *repository.RemotePostRepository
	eventRepo      *repository.FederationEventRepository
	httpClient     *http.Client
}

func NewFederationService() *FederationService {
	return &FederationService{
		instanceRepo:   repository.NewInstanceRepository(),
		remoteUserRepo: repository.NewRemoteUserRepository(),
		remotePostRepo: repository.NewRemotePostRepository(),
		eventRepo:      repository.NewFederationEventRepository(),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// DiscoverInstance discovers a remote instance by domain
func (s *FederationService) DiscoverInstance(ctx context.Context, domain string) (*models.Instance, error) {
	// Try to get from database first
	instance, err := s.instanceRepo.GetInstanceByDomain(ctx, domain)
	if err == nil {
		return instance, nil
	}

	// If not found, discover via well-known endpoint
	instanceInfoURL := fmt.Sprintf("http://%s/.well-known/instance-info", domain)
	resp, err := s.httpClient.Get(instanceInfoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to discover instance: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("instance discovery failed with status: %d", resp.StatusCode)
	}

	var instanceInfo struct {
		Instance   string `json:"instance"`
		Federation bool   `json:"federation"`
		Inbox      string `json:"inbox"`
		Version    string `json:"version"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&instanceInfo); err != nil {
		return nil, fmt.Errorf("failed to decode instance info: %w", err)
	}

	if !instanceInfo.Federation {
		return nil, fmt.Errorf("instance does not support federation")
	}

	// Create instance record
	newInstance := &models.Instance{
		Domain:     domain,
		InboxURL:   fmt.Sprintf("http://%s%s", domain, instanceInfo.Inbox),
		TrustLevel: "limited", // Default to limited trust
		LastSeenAt: time.Now(),
	}

	if err := s.instanceRepo.UpsertInstance(ctx, newInstance); err != nil {
		return nil, fmt.Errorf("failed to save instance: %w", err)
	}

	return newInstance, nil
}

// ValidateInstance checks if an instance is trusted
func (s *FederationService) ValidateInstance(ctx context.Context, domain string) error {
	instance, err := s.instanceRepo.GetInstanceByDomain(ctx, domain)
	if err != nil {
		return fmt.Errorf("instance not found: %w", err)
	}

	if instance.TrustLevel == "blocked" {
		return fmt.Errorf("instance is blocked")
	}

	return nil
}

// ValidateActivity validates an activity envelope
func (s *FederationService) ValidateActivity(envelope *models.ActivityEnvelope) error {
	if envelope.Type == "" {
		return fmt.Errorf("activity type is required")
	}

	if envelope.Actor == "" {
		return fmt.Errorf("actor is required")
	}

	if envelope.Origin == "" {
		return fmt.Errorf("origin is required")
	}

	if envelope.Object == nil {
		return fmt.Errorf("object is required")
	}

	return nil
}

// GetTrustedInstances retrieves all trusted instances
func (s *FederationService) GetTrustedInstances(ctx context.Context) ([]models.Instance, error) {
	return s.instanceRepo.GetInstancesByTrustLevel(ctx, "trusted")
}

// SendCreatePost sends a CreatePost activity to a target instance
func (s *FederationService) SendCreatePost(ctx context.Context, post *contentModels.Post, user *identityModels.User, targetInstance string) error {
	actorID := fmt.Sprintf("http://%s/users/%s", config.AppConfig.InstanceDomain, user.Username)
	postID := fmt.Sprintf("http://%s/posts/%s", config.AppConfig.InstanceDomain, post.ID.Hex())

	envelope := &models.ActivityEnvelope{
		Type:      "CreatePost",
		Actor:     actorID,
		Origin:    config.AppConfig.InstanceDomain,
		Timestamp: time.Now(),
		Object: bson.M{
			"id":           postID,
			"content":      post.Content,
			"author":       user.Username,
			"author_id":    actorID,
			"display_name": user.DisplayName,
			"avatar_url":   user.AvatarURL,
			"created_at":   post.CreatedAt,
			"visibility":   "public",
		},
	}

	return s.QueueFederationEvent(ctx, envelope, targetInstance)
}

// SendFollow sends a Follow activity to a target instance
func (s *FederationService) SendFollow(ctx context.Context, follower, following *identityModels.User, targetInstance string) error {
	followerActorID := fmt.Sprintf("http://%s/users/%s", config.AppConfig.InstanceDomain, follower.Username)
	followingActorID := fmt.Sprintf("http://%s/users/%s", targetInstance, following.Username)

	envelope := &models.ActivityEnvelope{
		Type:      "Follow",
		Actor:     followerActorID,
		Origin:    config.AppConfig.InstanceDomain,
		Timestamp: time.Now(),
		Object: bson.M{
			"follower_id":   followerActorID,
			"follower_name": follower.Username,
			"following_id":  followingActorID,
		},
	}

	return s.QueueFederationEvent(ctx, envelope, targetInstance)
}

// SendLike sends a Like activity to a target instance
func (s *FederationService) SendLike(ctx context.Context, postID string, user *identityModels.User, targetInstance string) error {
	actorID := fmt.Sprintf("http://%s/users/%s", config.AppConfig.InstanceDomain, user.Username)

	envelope := &models.ActivityEnvelope{
		Type:      "Like",
		Actor:     actorID,
		Origin:    config.AppConfig.InstanceDomain,
		Timestamp: time.Now(),
		Object: bson.M{
			"post_id":   postID,
			"user_id":   actorID,
			"user_name": user.Username,
		},
	}

	return s.QueueFederationEvent(ctx, envelope, targetInstance)
}

// SendComment sends a Comment activity to a target instance
func (s *FederationService) SendComment(ctx context.Context, comment *contentModels.Comment, user *identityModels.User, postID string, targetInstance string) error {
	actorID := fmt.Sprintf("http://%s/users/%s", config.AppConfig.InstanceDomain, user.Username)
	commentID := fmt.Sprintf("http://%s/comments/%s", config.AppConfig.InstanceDomain, comment.ID.Hex())

	envelope := &models.ActivityEnvelope{
		Type:      "Comment",
		Actor:     actorID,
		Origin:    config.AppConfig.InstanceDomain,
		Timestamp: time.Now(),
		Object: bson.M{
			"id":         commentID,
			"post_id":    postID,
			"content":    comment.Content,
			"author":     user.Username,
			"author_id":  actorID,
			"created_at": comment.CreatedAt,
		},
	}

	return s.QueueFederationEvent(ctx, envelope, targetInstance)
}

// QueueFederationEvent queues a federation event for asynchronous delivery
func (s *FederationService) QueueFederationEvent(ctx context.Context, envelope *models.ActivityEnvelope, targetInstance string) error {
	envelopeMap, err := structToBSON(envelope)
	if err != nil {
		return fmt.Errorf("failed to convert envelope to BSON: %w", err)
	}

	event := &models.FederationEvent{
		Type:           envelope.Type,
		TargetInstance: targetInstance,
		Payload:        envelopeMap,
		Status:         "pending",
	}

	if err := s.eventRepo.CreateEvent(ctx, event); err != nil {
		return fmt.Errorf("failed to queue federation event: %w", err)
	}

	log.Printf("Queued federation event: type=%s, target=%s", envelope.Type, targetInstance)
	return nil
}

// SendHTTPActivity sends an activity to a remote instance's inbox
func (s *FederationService) SendHTTPActivity(ctx context.Context, targetURL string, activity *models.ActivityEnvelope) error {
	payload, err := json.Marshal(activity)
	if err != nil {
		return fmt.Errorf("failed to marshal activity: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send activity: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("remote instance returned status: %d", resp.StatusCode)
	}

	return nil
}

// HandleIncomingActivity routes incoming activities to specific handlers
func (s *FederationService) HandleIncomingActivity(ctx context.Context, envelope *models.ActivityEnvelope) error {
	// Validate instance trust
	if err := s.ValidateInstance(ctx, envelope.Origin); err != nil {
		return fmt.Errorf("instance validation failed: %w", err)
	}

	// Validate activity structure
	if err := s.ValidateActivity(envelope); err != nil {
		return fmt.Errorf("activity validation failed: %w", err)
	}

	// Update instance last seen
	if err := s.instanceRepo.UpdateInstanceLastSeen(ctx, envelope.Origin); err != nil {
		log.Printf("Warning: failed to update instance last seen: %v", err)
	}

	// Route to specific handler
	switch envelope.Type {
	case "CreatePost":
		return s.HandleCreatePost(ctx, envelope)
	case "Follow":
		return s.HandleFollow(ctx, envelope)
	case "Like":
		return s.HandleLike(ctx, envelope)
	case "Comment":
		return s.HandleComment(ctx, envelope)
	case "Delete":
		return s.HandleDelete(ctx, envelope)
	default:
		return fmt.Errorf("unsupported activity type: %s", envelope.Type)
	}
}

// HandleCreatePost handles incoming CreatePost activities
func (s *FederationService) HandleCreatePost(ctx context.Context, envelope *models.ActivityEnvelope) error {
	obj := envelope.Object

	postID, ok := obj["id"].(string)
	if !ok {
		return fmt.Errorf("invalid post ID")
	}

	content, ok := obj["content"].(string)
	if !ok {
		return fmt.Errorf("invalid content")
	}

	author, ok := obj["author"].(string)
	if !ok {
		return fmt.Errorf("invalid author")
	}

	authorActorID, ok := obj["author_id"].(string)
	if !ok {
		return fmt.Errorf("invalid author_id")
	}

	// Parse created_at
	var createdAt time.Time
	if createdAtVal, ok := obj["created_at"]; ok {
		switch v := createdAtVal.(type) {
		case time.Time:
			createdAt = v
		case primitive.DateTime:
			createdAt = v.Time()
		case string:
			parsed, err := time.Parse(time.RFC3339, v)
			if err == nil {
				createdAt = parsed
			} else {
				createdAt = time.Now()
			}
		default:
			createdAt = time.Now()
		}
	} else {
		createdAt = time.Now()
	}

	// Cache remote user
	displayName, _ := obj["display_name"].(string)
	avatarURL, _ := obj["avatar_url"].(string)

	remoteUser := &models.RemoteUser{
		ActorID:     authorActorID,
		Username:    author,
		DisplayName: displayName,
		Instance:    envelope.Origin,
		AvatarURL:   avatarURL,
	}

	if err := s.remoteUserRepo.UpsertRemoteUser(ctx, remoteUser); err != nil {
		log.Printf("Warning: failed to cache remote user: %v", err)
	}

	// Create remote post
	remotePost := &models.RemotePost{
		RemotePostID:   postID,
		OriginInstance: envelope.Origin,
		Author:         fmt.Sprintf("%s@%s", author, envelope.Origin),
		AuthorActorID:  authorActorID,
		Content:        content,
		Visibility:     "public",
		CreatedAt:      createdAt,
	}

	if err := s.remotePostRepo.UpsertRemotePost(ctx, remotePost); err != nil {
		return fmt.Errorf("failed to create remote post: %w", err)
	}

	log.Printf("Received CreatePost from %s: %s", envelope.Origin, postID)
	return nil
}

// HandleFollow handles incoming Follow activities
func (s *FederationService) HandleFollow(ctx context.Context, envelope *models.ActivityEnvelope) error {
	// For now, just log the follow activity
	// In a full implementation, you would create a remote follow record
	log.Printf("Received Follow from %s: %s", envelope.Origin, envelope.Actor)
	return nil
}

// HandleLike handles incoming Like activities
func (s *FederationService) HandleLike(ctx context.Context, envelope *models.ActivityEnvelope) error {
	// For now, just log the like activity
	// In a full implementation, you would increment like count on the post
	log.Printf("Received Like from %s: %s", envelope.Origin, envelope.Actor)
	return nil
}

// HandleComment handles incoming Comment activities
func (s *FederationService) HandleComment(ctx context.Context, envelope *models.ActivityEnvelope) error {
	// For now, just log the comment activity
	// In a full implementation, you would create a remote comment record
	log.Printf("Received Comment from %s: %s", envelope.Origin, envelope.Actor)
	return nil
}

// HandleDelete handles incoming Delete activities
func (s *FederationService) HandleDelete(ctx context.Context, envelope *models.ActivityEnvelope) error {
	obj := envelope.Object

	objectID, ok := obj["id"].(string)
	if !ok {
		return fmt.Errorf("invalid object ID")
	}

	// Delete remote post if it exists
	if err := s.remotePostRepo.DeleteRemotePost(ctx, objectID); err != nil {
		log.Printf("Warning: failed to delete remote post: %v", err)
	}

	log.Printf("Received Delete from %s: %s", envelope.Origin, objectID)
	return nil
}

// Helper function to convert struct to bson.M
func structToBSON(v interface{}) (bson.M, error) {
	data, err := bson.Marshal(v)
	if err != nil {
		return nil, err
	}

	var result bson.M
	err = bson.Unmarshal(data, &result)
	return result, err
}
