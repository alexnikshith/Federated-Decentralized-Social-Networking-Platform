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
	identityRepo "federated-social/backend/epics/identity/repository"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FederationService struct {
	instanceRepo      *repository.InstanceRepository
	remoteUserRepo    *repository.RemoteUserRepository
	remotePostRepo    *repository.RemotePostRepository
	eventRepo         *repository.FederationEventRepository
	relationshipsRepo *repository.RemoteRelationshipsRepository
	userRepo          *identityRepo.UserRepository // Need to alias this import
	httpClient        *http.Client
}

func NewFederationService() *FederationService {
	return &FederationService{
		instanceRepo:      repository.NewInstanceRepository(),
		remoteUserRepo:    repository.NewRemoteUserRepository(),
		remotePostRepo:    repository.NewRemotePostRepository(),
		eventRepo:         repository.NewFederationEventRepository(),
		relationshipsRepo: repository.NewRemoteRelationshipsRepository(),
		userRepo:          identityRepo.NewUserRepository(),
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

	// Map localhost ports to Docker service names for inter-container communication
	// This ensures that when running in Docker, we can reach other containers
	fetchDomain := domain
	if strings.HasPrefix(domain, "localhost:8081") {
		fetchDomain = "backend2:8080"
		log.Printf("DiscoverInstance: Mapped localhost:8081 to backend2:8080 for Docker networking")
	} else if strings.HasPrefix(domain, "localhost:8080") {
		fetchDomain = "backend:8080"
		log.Printf("DiscoverInstance: Mapped localhost:8080 to backend:8080 for Docker networking")
	}

	// If not found, discover via well-known endpoint
	instanceInfoURL := fmt.Sprintf("http://%s/.well-known/instance-info", fetchDomain)
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
		Domain:     domain,                                                      // Keep original domain for validation
		InboxURL:   fmt.Sprintf("http://%s%s", fetchDomain, instanceInfo.Inbox), // Use mapped domain for reachable inbox
		TrustLevel: "limited",                                                   // Default to limited trust
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

	// Map localhost URLs for Docker networking
	finalURL := targetURL
	if strings.Contains(targetURL, "localhost:8081") {
		finalURL = strings.Replace(targetURL, "localhost:8081", "backend2:8080", 1)
		log.Printf("SendHTTPActivity: Mapped localhost:8081 to backend2:8080")
	} else if strings.Contains(targetURL, "localhost:8080") {
		finalURL = strings.Replace(targetURL, "localhost:8080", "backend:8080", 1)
		log.Printf("SendHTTPActivity: Mapped localhost:8080 to backend:8080")
	}

	req, err := http.NewRequestWithContext(ctx, "POST", finalURL, bytes.NewBuffer(payload))
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
		// If instance not found, try to discover it
		if strings.Contains(err.Error(), "instance not found") {
			log.Printf("HandleIncomingActivity: Instance %s not found, attempting discovery", envelope.Origin)
			_, discoverErr := s.DiscoverInstance(ctx, envelope.Origin)
			if discoverErr != nil {
				return fmt.Errorf("instance discovery failed for %s: %w", envelope.Origin, discoverErr)
			}
			// Re-validate after discovery
			if err := s.ValidateInstance(ctx, envelope.Origin); err != nil {
				return fmt.Errorf("instance validation failed after discovery: %w", err)
			}
		} else {
			return fmt.Errorf("instance validation failed: %w", err)
		}
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
	case "Notification":
		return s.HandleNotification(ctx, envelope)
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
	// Handle incoming follow request
	obj := envelope.Object

	followerID, ok := obj["follower_id"].(string)
	if !ok {
		return fmt.Errorf("invalid follower_id")
	}

	followerName, _ := obj["follower_name"].(string)
	followerDisplayName, _ := obj["follower_display_name"].(string)
	followerAvatar, _ := obj["follower_avatar"].(string)

	followingID, ok := obj["following_id"].(string)
	if !ok {
		return fmt.Errorf("invalid following_id")
	}

	// 1. Resolve local user from followingID (Actor ID)
	var username string
	for i := len(followingID) - 1; i >= 0; i-- {
		if followingID[i] == '/' {
			username = followingID[i+1:]
			break
		}
	}

	if username == "" {
		return fmt.Errorf("could not extract username from actor ID: %s", followingID)
	}

	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil {
		return fmt.Errorf("user not found: %s", username)
	}
	if user == nil {
		return fmt.Errorf("user not found: %s", username)
	}

	// Cache the remote follower user details
	if followerName == "" {
		// Fallback: extract from ID
		for i := len(followerID) - 1; i >= 0; i-- {
			if followerID[i] == '/' {
				followerName = followerID[i+1:]
				break
			}
		}
	}
	if followerDisplayName == "" {
		followerDisplayName = followerName
	}

	remoteUser := &models.RemoteUser{
		ActorID:     followerID,
		Username:    followerName,
		DisplayName: followerDisplayName,
		AvatarURL:   followerAvatar,
		Instance:    envelope.Origin,
		FetchedAt:   time.Now(),
	}

	if err := s.remoteUserRepo.UpsertRemoteUser(ctx, remoteUser); err != nil {
		log.Printf("Warning: failed to cache remote user from follow: %v", err)
	}

	// 2. Store Remote Follower relationship
	remoteFollower := &models.RemoteFollower{
		LocalUserID:    user.ID,
		RemoteActorID:  followerID,
		RemoteInstance: envelope.Origin,
		CreatedAt:      time.Now(),
	}

	if err := s.relationshipsRepo.AddRemoteFollower(ctx, remoteFollower); err != nil {
		return fmt.Errorf("failed to save remote follower: %w", err)
	}

	log.Printf("Follow accepted: %s (remote) -> %s (local)", followerID, username)
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

// ResolveRemoteUser finds a user on a remote instance and caches them locally
func (s *FederationService) ResolveRemoteUser(ctx context.Context, handle string) (*models.RemoteUser, error) {
	// Parse handle (user@domain)
	var username, domain string
	if idx := len(handle) - 1; idx > 0 {
		for i := 0; i < len(handle); i++ {
			if handle[i] == '@' {
				username = handle[:i]
				domain = handle[i+1:]
				break
			}
		}
	}

	if username == "" || domain == "" {
		return nil, fmt.Errorf("invalid handle format, expected user@domain")
	}

	// Sanitize domain
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimPrefix(domain, "https://")

	// Map localhost ports to Docker service names for inter-container communication
	// When running in Docker, localhost:8081 should map to backend2:8080
	if strings.HasPrefix(domain, "localhost:8081") {
		domain = "backend2:8080"
		log.Printf("ResolveRemoteUser: Mapped localhost:8081 to backend2:8080 for Docker networking")
	} else if strings.HasPrefix(domain, "localhost:8080") {
		domain = "backend:8080"
		log.Printf("ResolveRemoteUser: Mapped localhost:8080 to backend:8080 for Docker networking")
	}

	log.Printf("ResolveRemoteUser: Resolving %s@%s", username, domain)

	// Check if we already have this user cached?
	// For now, let's always fetch fresh data or at least check cache first
	// We don't have GetRemoteUserByHandle in repo yet, maybe strictly by ActorID
	// But let's try to fetch from remote

	// Discover instance first to ensure we can talk to it
	log.Printf("ResolveRemoteUser: Discovering instance %s", domain)
	if _, err := s.DiscoverInstance(ctx, domain); err != nil {
		log.Printf("ResolveRemoteUser: Failed to discover instance %s: %v", domain, err)
		return nil, fmt.Errorf("failed to discover instance %s: %w", domain, err)
	}

	// Fetch user profile
	// Assuming standard endpoint /api/profile/{username} as per our own spec
	// In strict ActivityPub this would be WebFinger + Actor JSON
	profileURL := fmt.Sprintf("http://%s/api/profile/%s", domain, username)
	log.Printf("ResolveRemoteUser: Fetching profile from %s", profileURL)
	resp, err := s.httpClient.Get(profileURL)
	if err != nil {
		log.Printf("ResolveRemoteUser: HTTP request failed: %v", err)
		return nil, fmt.Errorf("failed to fetch remote profile: %w", err)
	}
	defer resp.Body.Close()

	log.Printf("ResolveRemoteUser: Got status code %d from %s", resp.StatusCode, profileURL)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("remote profile not found (status %d)", resp.StatusCode)
	}

	// We utilize a flexible struct to decode common fields
	var profile struct {
		ID                string `json:"id"`
		Username          string `json:"username"`
		DisplayName       string `json:"display_name"`
		AvatarURL         string `json:"avatar_url"`
		Bio               string `json:"bio"`
		ProfileVisibility string `json:"profile_visibility"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("failed to decode remote profile: %w", err)
	}

	// Construct Remote User
	// Reverse map internal docker names to public localhost ports for frontend-consumable URLs
	publicDomain := domain
	if domain == "backend2:8080" {
		publicDomain = "localhost:8081"
	} else if domain == "backend:8080" {
		publicDomain = "localhost:8080"
	}

	// Ensure absolute URL for Avatar (since backend might return relative)
	avatarURL := profile.AvatarURL
	if strings.HasPrefix(avatarURL, "/") {
		avatarURL = fmt.Sprintf("http://%s%s", publicDomain, avatarURL)
	}

	// Construct Remote User
	remoteUser := &models.RemoteUser{
		ActorID:           fmt.Sprintf("http://%s/users/%s", publicDomain, profile.Username), // Construct Actor ID with PUBLIC domain for consistency
		Username:          profile.Username,
		DisplayName:       profile.DisplayName,
		Instance:          domain,
		AvatarURL:         avatarURL,
		Bio:               profile.Bio,
		ProfileVisibility: profile.ProfileVisibility,
		FetchedAt:         time.Now(),
	}

	// Upsert into our cache
	if err := s.remoteUserRepo.UpsertRemoteUser(ctx, remoteUser); err != nil {
		return nil, fmt.Errorf("failed to cache remote user: %w", err)
	}

	return remoteUser, nil
}

// FollowRemoteUser handles a local user following a remote user
func (s *FederationService) FollowRemoteUser(ctx context.Context, localUserID primitive.ObjectID, remoteUser *models.RemoteUser) error {
	log.Printf("FollowRemoteUser: localUserID=%s, remoteUser=%s@%s", localUserID.Hex(), remoteUser.Username, remoteUser.Instance)

	// Fetch local user
	localUser, err := s.userRepo.FindByID(ctx, localUserID)
	if err != nil {
		log.Printf("FollowRemoteUser: Failed to fetch local user: %v", err)
		return fmt.Errorf("failed to fetch local user: %w", err)
	}
	if localUser == nil {
		return fmt.Errorf("local user not found")
	}

	// 1. Check if already following
	isAlreadyFollowing, err := s.IsRemoteFollowing(ctx, localUser.ID, remoteUser.ActorID)
	if err == nil && isAlreadyFollowing {
		log.Printf("FollowRemoteUser: Already following %s@%s", remoteUser.Username, remoteUser.Instance)
		return nil // Already following, no error
	}

	// 2. Create local record of "I follow them"
	remoteFollow := &models.RemoteFollow{
		LocalUserID:    localUser.ID,
		RemoteActorID:  remoteUser.ActorID,
		RemoteUsername: remoteUser.Username,
		RemoteInstance: remoteUser.Instance,
		CreatedAt:      time.Now(),
	}

	log.Printf("FollowRemoteUser: Adding remote follow record")
	if err := s.relationshipsRepo.AddRemoteFollow(ctx, remoteFollow); err != nil {
		log.Printf("FollowRemoteUser: Failed to record remote follow: %v", err)
		return fmt.Errorf("failed to record remote follow: %w", err)
	}

	// 2. Send "Follow" Activity to remote instance
	followerActorID := fmt.Sprintf("http://%s/users/%s", config.AppConfig.InstanceDomain, localUser.Username)

	envelope := &models.ActivityEnvelope{
		Type:      "Follow",
		Actor:     followerActorID,
		Origin:    config.AppConfig.InstanceDomain,
		Timestamp: time.Now(),
		Object: bson.M{
			"follower_id":           followerActorID,
			"follower_name":         localUser.Username,
			"follower_display_name": localUser.DisplayName,
			"follower_avatar":       localUser.AvatarURL,
			"following_id":          remoteUser.ActorID, // Target
		},
	}

	// 3. Initiate Backfill of Remote Posts (Async)
	go s.backfillRemotePosts(context.Background(), remoteUser)

	return s.QueueFederationEvent(ctx, envelope, remoteUser.Instance)
}

// UnfollowRemoteUser handles a local user unfollowing a remote user
func (s *FederationService) UnfollowRemoteUser(ctx context.Context, localUserID primitive.ObjectID, remoteUser *models.RemoteUser) error {
	// 1. Remove local record of remote follow
	if err := s.relationshipsRepo.RemoveRemoteFollow(ctx, localUserID, remoteUser.ActorID, remoteUser.Username, remoteUser.Instance); err != nil {
		return fmt.Errorf("failed to remove remote follow record: %w", err)
	}

	// Fetch local user for ActorID
	localUser, err := s.userRepo.FindByID(ctx, localUserID)
	if err != nil {
		return fmt.Errorf("failed to fetch local user: %w", err)
	}

	// 2. Send "Undo" Activity to remote instance
	followerActorID := fmt.Sprintf("http://%s/users/%s", config.AppConfig.InstanceDomain, localUser.Username)

	envelope := &models.ActivityEnvelope{
		Type:      "Undo",
		Actor:     followerActorID,
		Origin:    config.AppConfig.InstanceDomain,
		Timestamp: time.Now(),
		Object: bson.M{
			"type":   "Follow",
			"actor":  followerActorID,
			"object": remoteUser.ActorID,
		},
	}

	return s.QueueFederationEvent(ctx, envelope, remoteUser.Instance)
}

// RemoveRemoteFollow removes a remote follow relationship (simplified wrapper for handlers)
func (s *FederationService) RemoveRemoteFollow(ctx context.Context, localUserID primitive.ObjectID, actorID, username, instance string) error {
	log.Printf("RemoveRemoteFollow: localUserID=%s, actorID=%s", localUserID.Hex(), actorID)

	// Remove from database
	if err := s.relationshipsRepo.RemoveRemoteFollow(ctx, localUserID, actorID, username, instance); err != nil {
		log.Printf("RemoveRemoteFollow: Failed to remove remote follow: %v", err)
		return fmt.Errorf("failed to remove remote follow: %w", err)
	}

	log.Printf("RemoveRemoteFollow: Successfully removed follow for %s@%s", username, instance)
	return nil
}

func (s *FederationService) GetFollowerInstances(ctx context.Context, userID primitive.ObjectID) ([]string, error) {
	return s.relationshipsRepo.GetFollowerInstances(ctx, userID)
}

// GetRemoteFollowing returns all remote users followed by a local user
func (s *FederationService) GetRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollow, error) {
	return s.relationshipsRepo.GetRemoteFollowing(ctx, localUserID)
}

// IsRemoteFollowing checks if a local user follows a specific remote actor
func (s *FederationService) IsRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID, remoteActorID string) (bool, error) {
	// Log for debugging follow button state
	// log.Printf("IsRemoteFollowing Check: localUserID=%s, remoteActorID=%s", localUserID.Hex(), remoteActorID)

	follows, err := s.relationshipsRepo.GetRemoteFollowing(ctx, localUserID)
	if err != nil {
		return false, err
	}

	// log.Printf("IsRemoteFollowing: Found %d remote follows for user", len(follows))
	for _, f := range follows {
		if f.RemoteActorID == remoteActorID {
			return true, nil
		}
	}
	return false, nil
}

// GetRemoteFollowers returns all remote users following a local user
func (s *FederationService) GetRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollower, error) {
	return s.relationshipsRepo.GetRemoteFollowers(ctx, localUserID)
}

// CountRemoteFollowers returns count of remote users following a local user
func (s *FederationService) CountRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) (int64, error) {
	return s.relationshipsRepo.CountRemoteFollowers(ctx, localUserID)
}

// CountRemoteFollowing returns count of remote users a local user is following
func (s *FederationService) CountRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) (int64, error) {
	return s.relationshipsRepo.CountRemoteFollowing(ctx, localUserID)
}

// SendRemoteNotification sends a notification activity to a remote instance
func (s *FederationService) SendRemoteNotification(ctx context.Context, targetInstance string, notification *contentModels.Notification, author *identityModels.User) error {
	actorID := fmt.Sprintf("http://%s/users/%s", config.AppConfig.InstanceDomain, author.Username)

	envelope := &models.ActivityEnvelope{
		Type:      "Notification",
		Actor:     actorID,
		Origin:    config.AppConfig.InstanceDomain,
		Timestamp: time.Now(),
		Object: bson.M{
			"type":                notification.Type,
			"related_entity_id":   notification.RelatedEntityID.Hex(),
			"related_user_id":     notification.UserID.Hex(), // Target user ID on our system (mapped)
			"related_user_name":   author.DisplayName,        // Our sender name
			"related_user_avatar": author.AvatarURL,
			"comment_content":     notification.CommentContent,
		},
	}

	return s.QueueFederationEvent(ctx, envelope, targetInstance)
}

// HandleNotification handles incoming notification activities
func (s *FederationService) HandleNotification(ctx context.Context, envelope *models.ActivityEnvelope) error {
	// We need to resolve which LOCAL user this is for
	// In a real system, the Actor would be the sender, and the Target would be in the object
	// For now, our Notification object structure is simple.

	// We'll trust the envelope actor for "who sent it"
	// But "who is it for" is tricky without a target field in current envelope
	// Let's assume for now mentions carry the target username or ID
	return nil // To be implemented if we want to support incoming
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

// GetRemotePostsByAuthors retrieves remote posts by a list of author actor IDs
func (s *FederationService) GetRemotePostsByAuthors(ctx context.Context, actorIDs []string, limit int64) ([]models.RemotePost, error) {
	return s.remotePostRepo.GetRemotePostsByAuthors(ctx, actorIDs, limit)
}

// GetRemoteUsersByActorIDs retrieves multiple remote users by their Actor IDs
func (s *FederationService) GetRemoteUsersByActorIDs(ctx context.Context, actorIDs []string) (map[string]*models.RemoteUser, error) {
	return s.remoteUserRepo.GetRemoteUsersByActorIDs(ctx, actorIDs)
}

// GetRemoteUserByID retrieves a remote user by their local ObjectID
func (s *FederationService) GetRemoteUserByID(ctx context.Context, id primitive.ObjectID) (*models.RemoteUser, error) {
	return s.remoteUserRepo.GetRemoteUserByID(ctx, id)
}

// backfillRemotePosts fetches and saves initial posts from a newly followed user
func (s *FederationService) backfillRemotePosts(ctx context.Context, remoteUser *models.RemoteUser) {
	log.Printf("Backfill: Starting for %s@%s", remoteUser.Username, remoteUser.Instance)

	// Construct URL: http://<domain>/api/users/<username>/posts
	url := fmt.Sprintf("http://%s/api/users/%s/posts", remoteUser.Instance, remoteUser.Username)

	resp, err := s.httpClient.Get(url)
	if err != nil {
		log.Printf("Backfill failed: Request error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Backfill failed: Status %d", resp.StatusCode)
		return
	}

	var feedResponse struct {
		Data struct {
			Posts []struct {
				ID           string    `json:"id"`
				Content      string    `json:"content"`
				CreatedAt    time.Time `json:"created_at"`
				UpdatedAt    time.Time `json:"updated_at"`
				LikeCount    int       `json:"like_count"`
				CommentCount int       `json:"comment_count"`
			} `json:"posts"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&feedResponse); err != nil {
		log.Printf("Backfill failed: Decode error: %v", err)
		return
	}

	log.Printf("Backfill: Found %d posts for %s", len(feedResponse.Data.Posts), remoteUser.Username)

	for _, p := range feedResponse.Data.Posts {
		// Only import if ID is valid (hex string)
		if p.ID == "" {
			continue
		}

		rp := &models.RemotePost{
			RemotePostID:   p.ID,
			OriginInstance: remoteUser.Instance,
			Author:         remoteUser.Username,
			AuthorActorID:  remoteUser.ActorID,
			Content:        p.Content,
			Visibility:     "public",
			CreatedAt:      p.CreatedAt,
			UpdatedAt:      p.UpdatedAt,
			ReceivedAt:     time.Now(),
			LikeCount:      p.LikeCount,
			CommentCount:   p.CommentCount,
		}
		if err := s.remotePostRepo.UpsertRemotePost(ctx, rp); err != nil {
			log.Printf("Backfill: Failed to upsert post %s: %v", p.ID, err)
		}
	}
}
