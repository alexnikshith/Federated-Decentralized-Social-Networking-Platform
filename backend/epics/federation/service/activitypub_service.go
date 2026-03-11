package service

// activitypub_service.go — ActivityPub / Mastodon interoperability layer
//
// Extends the existing FederationService with ActivityPub-specific behaviour.
// All methods live on *FederationService to avoid architectural changes.
// The internal Docker-to-Docker federation (/federation/inbox) is untouched.

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"federated-social/backend/config"
	"federated-social/backend/epics/federation/models"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---------------------------------------------------------------------------
// ActivityPub wire types
// ---------------------------------------------------------------------------

// APPublicKey is the publicKey object inside a Person actor.
type APPublicKey struct {
	ID           string `json:"id"`
	Owner        string `json:"owner"`
	PublicKeyPem string `json:"publicKeyPem"`
}

// APActor is a minimal ActivityPub Person/Service actor as returned by
// Mastodon and other AP implementations.
type APActor struct {
	Context           interface{} `json:"@context"`
	ID                string      `json:"id"`
	Type              string      `json:"type"`
	PreferredUsername string      `json:"preferredUsername"`
	Inbox             string      `json:"inbox"`
	Outbox            string      `json:"outbox"`
	Followers         string      `json:"followers,omitempty"`
	Following         string      `json:"following,omitempty"`
	PublicKey         APPublicKey `json:"publicKey"`
	Name              string      `json:"name,omitempty"`
	Summary           string      `json:"summary,omitempty"`
	Icon              *APIcon     `json:"icon,omitempty"`
}

// APIcon is the icon/avatar attachment on an actor.
type APIcon struct {
	Type      string `json:"type"`
	MediaType string `json:"mediaType,omitempty"`
	URL       string `json:"url"`
}

// WebFingerLink is a single link in a WebFinger JRD document.
type WebFingerLink struct {
	Rel  string `json:"rel"`
	Type string `json:"type,omitempty"`
	Href string `json:"href,omitempty"`
}

// WebFingerResponse is the JRD document returned by /.well-known/webfinger.
type WebFingerResponse struct {
	Subject string          `json:"subject"`
	Links   []WebFingerLink `json:"links"`
}

// ---------------------------------------------------------------------------
// Part 1 — WebFinger
// ---------------------------------------------------------------------------

// BuildWebFinger constructs the WebFinger JRD for a given local username.
// Returns an error if the user does not exist.
func (s *FederationService) BuildWebFinger(ctx context.Context, username string) (*WebFingerResponse, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found: %s", username)
	}

	base := config.AppConfig.BaseURL()
	actorURL := fmt.Sprintf("%s/users/%s", base, user.Username)
	subject := fmt.Sprintf("acct:%s@%s", user.Username, config.AppConfig.InstanceDomain)

	return &WebFingerResponse{
		Subject: subject,
		Links: []WebFingerLink{
			{
				Rel:  "self",
				Type: "application/activity+json",
				Href: actorURL,
			},
		},
	}, nil
}

// ---------------------------------------------------------------------------
// Part 2 — Actor endpoint
// ---------------------------------------------------------------------------

// BuildActorJSON constructs an ActivityPub Person object for a local user.
// It lazily generates an RSA keypair if the user doesn't have one yet.
func (s *FederationService) BuildActorJSON(ctx context.Context, username string) (map[string]interface{}, error) {
	// Find user
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found: %s", username)
	}

	// Ensure RSA keypair exists
	user, err = s.userRepo.EnsureKeyPair(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to ensure keypair: %w", err)
	}

	base := config.AppConfig.BaseURL()
	actorURL := fmt.Sprintf("%s/users/%s", base, user.Username)
	keyID := actorURL + "#main-key"

	actor := map[string]interface{}{
		"@context": []interface{}{
			"https://www.w3.org/ns/activitystreams",
			"https://w3id.org/security/v1",
		},
		"id":                actorURL,
		"type":              "Person",
		"preferredUsername": user.Username,
		"name":              user.DisplayName,
		"summary":           user.Bio,
		"inbox":             actorURL + "/inbox",
		"outbox":            actorURL + "/outbox",
		"followers":         actorURL + "/followers",
		"following":         actorURL + "/following",
		"publicKey": map[string]interface{}{
			"id":           keyID,
			"owner":        actorURL,
			"publicKeyPem": user.PublicKeyPem,
		},
	}

	// Add avatar if set
	if user.AvatarURL != "" {
		avatarURL := user.AvatarURL
		if strings.HasPrefix(avatarURL, "/") {
			avatarURL = base + avatarURL
		}
		actor["icon"] = map[string]interface{}{
			"type":      "Image",
			"mediaType": "image/png",
			"url":       avatarURL,
		}
	}

	return actor, nil
}

// ---------------------------------------------------------------------------
// Part 3 — Remote actor resolution (Mastodon WebFinger)
// ---------------------------------------------------------------------------

// FetchRemoteActor fetches and parses an ActivityPub actor JSON from a remote URL.
func (s *FederationService) FetchRemoteActor(ctx context.Context, actorURL string) (*APActor, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", actorURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build actor request: %w", err)
	}
	req.Header.Set("Accept", "application/activity+json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch actor %s: %w", actorURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("actor fetch returned status %d for %s", resp.StatusCode, actorURL)
	}

	var actor APActor
	if err := json.NewDecoder(resp.Body).Decode(&actor); err != nil {
		return nil, fmt.Errorf("failed to decode actor JSON: %w", err)
	}
	return &actor, nil
}

// WebFingerResolveHandle performs WebFinger on a remote handle (@alice@mastodon.social)
// and fetches the actor JSON, returning a parsed APActor.
func (s *FederationService) WebFingerResolveHandle(ctx context.Context, handle string) (*APActor, error) {
	// Strip leading @
	handle = strings.TrimPrefix(handle, "@")

	// Parse user@domain
	parts := strings.SplitN(handle, "@", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("invalid handle format, expected user@domain, got: %s", handle)
	}
	username, domain := parts[0], parts[1]

	// Build WebFinger URL (always HTTPS for external instances per spec)
	scheme := "https"
	if strings.HasPrefix(domain, "localhost") || strings.HasPrefix(domain, "127.0.0.1") {
		scheme = "http"
	}
	webfingerURL := fmt.Sprintf("%s://%s/.well-known/webfinger?resource=acct:%s@%s",
		scheme, domain, username, domain)

	log.Printf("ActivityPub: WebFinger lookup for %s at %s", handle, webfingerURL)

	req, err := http.NewRequestWithContext(ctx, "GET", webfingerURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build WebFinger request: %w", err)
	}
	req.Header.Set("Accept", "application/jrd+json, application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("WebFinger lookup failed for %s: %w", handle, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("WebFinger returned status %d for %s", resp.StatusCode, handle)
	}

	// Parse WebFinger JRD
	var jrd struct {
		Subject string `json:"subject"`
		Links   []struct {
			Rel  string `json:"rel"`
			Type string `json:"type"`
			Href string `json:"href"`
		} `json:"links"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jrd); err != nil {
		return nil, fmt.Errorf("failed to decode WebFinger JRD: %w", err)
	}

	// Find the self link (application/activity+json)
	var actorURL string
	for _, link := range jrd.Links {
		if link.Rel == "self" && (link.Type == "application/activity+json" || link.Type == "application/ld+json; profile=\"https://www.w3.org/ns/activitystreams\"") {
			actorURL = link.Href
			break
		}
	}
	if actorURL == "" {
		return nil, fmt.Errorf("no ActivityPub actor link in WebFinger response for %s", handle)
	}

	log.Printf("ActivityPub: Fetching actor from %s", actorURL)
	return s.FetchRemoteActor(ctx, actorURL)
}

// FollowMastodonUser executes the full outgoing follow flow for a remote Mastodon handle:
//  1. Parse handle, WebFinger lookup, fetch actor
//  2. Upsert into remote_users collection
//  3. Record local RemoteFollow relationship
//  4. Send a signed ActivityPub Follow activity to the remote inbox
func (s *FederationService) FollowMastodonUser(ctx context.Context, localUserID primitive.ObjectID, handle string) error {
	// Fetch local user (using the existing userRepo)
	localUser, err := s.userRepo.FindByID(ctx, localUserID)
	if err != nil || localUser == nil {
		return fmt.Errorf("local user not found")
	}

	// Ensure we have a keypair for signing
	localUser, err = s.userRepo.EnsureKeyPair(ctx, localUser.ID)
	if err != nil {
		return fmt.Errorf("keypair error: %w", err)
	}

	// Resolve handle via WebFinger
	actor, err := s.WebFingerResolveHandle(ctx, handle)
	if err != nil {
		return fmt.Errorf("failed to resolve handle %s: %w", handle, err)
	}

	// Extract domain from actor ID
	domain := extractDomain(actor.ID)

	// Build RemoteUser from actor
	remoteUser := &models.RemoteUser{
		ActorID:   actor.ID,
		Username:  actor.PreferredUsername,
		Instance:  domain,
		FetchedAt: time.Now(),
		CreatedAt: time.Now(),
	}
	if actor.Name != "" {
		remoteUser.DisplayName = actor.Name
	} else {
		remoteUser.DisplayName = actor.PreferredUsername
	}
	if actor.Summary != "" {
		remoteUser.Bio = actor.Summary
	}
	if actor.Icon != nil {
		remoteUser.AvatarURL = actor.Icon.URL
	}

	// Upsert into remote_users
	if err := s.remoteUserRepo.UpsertRemoteUser(ctx, remoteUser); err != nil {
		return fmt.Errorf("failed to cache remote user: %w", err)
	}

	// Check not already following
	already, _ := s.IsRemoteFollowing(ctx, localUser.ID, actor.ID)
	if already {
		return nil // idempotent
	}

	// Record local follow relationship
	remoteFollow := &models.RemoteFollow{
		LocalUserID:    localUser.ID,
		RemoteActorID:  actor.ID,
		RemoteUsername: actor.PreferredUsername,
		RemoteInstance: domain,
		Status:         "pending",
		CreatedAt:      time.Now(),
	}
	if err := s.relationshipsRepo.AddRemoteFollow(ctx, remoteFollow); err != nil {
		return fmt.Errorf("failed to record remote follow: %w", err)
	}

	// Build ActivityPub Follow activity
	base := config.AppConfig.BaseURL()
	activityID := fmt.Sprintf("%s/activities/%s", base, newUUID())
	localActorURL := fmt.Sprintf("%s/users/%s", base, localUser.Username)

	followActivity := map[string]interface{}{
		"@context": "https://www.w3.org/ns/activitystreams",
		"id":       activityID,
		"type":     "Follow",
		"actor":    localActorURL,
		"object":   actor.ID,
	}

	// Send signed activity to remote inbox
	if err := s.SendAPActivity(ctx, actor.Inbox, followActivity, localUser.PrivateKeyPem, localActorURL+"#main-key"); err != nil {
		log.Printf("ActivityPub: Warning - failed to send Follow to %s: %v", actor.Inbox, err)
		// Not fatal — local record is saved; delivery can be retried
	}

	// Asynchronously fetch their history to populate feed
	go func() {
		bgCtx := context.Background()
		if err := s.FetchAndIngestOutbox(bgCtx, actor, remoteUser); err != nil {
			log.Printf("ActivityPub: Warning - failed to fetch outbox for %s: %v", actor.PreferredUsername, err)
		}
	}()

	log.Printf("ActivityPub: Sent Follow activity to %s (inbox: %s)", actor.ID, actor.Inbox)
	return nil
}

// UnfollowRemoteUser sends a signed AP Undo{Follow} to the remote inbox and removes the local follow record.
// Without sending the Undo, Mastodon keeps the follower relationship on its side, causing re-follow to silently fail.
func (s *FederationService) UnfollowRemoteUser(ctx context.Context, localUserID primitive.ObjectID, remoteUser *models.RemoteUser) error {
	// Load local user + ensure signing key
	localUser, err := s.userRepo.FindByID(ctx, localUserID)
	if err != nil || localUser == nil {
		return fmt.Errorf("local user not found")
	}
	localUser, err = s.userRepo.EnsureKeyPair(ctx, localUser.ID)
	if err != nil {
		return fmt.Errorf("keypair error: %w", err)
	}

	base := config.AppConfig.BaseURL()
	localActorURL := fmt.Sprintf("%s/users/%s", base, localUser.Username)

	// Resolve remote inbox (use stored InboxURL from cache, fallback to FetchRemoteActor)
	inboxURL := remoteUser.InboxURL
	if inboxURL == "" {
		fetchCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
		defer cancel()
		actor, fetchErr := s.FetchRemoteActor(fetchCtx, remoteUser.ActorID)
		if fetchErr == nil {
			inboxURL = actor.Inbox
		}
	}

	if inboxURL == "" {
		log.Printf("[AP Unfollow] Warning: no inbox URL for %s — removing local record only", remoteUser.ActorID)
	} else {
		// Build Undo{Follow} activity
		activityID := fmt.Sprintf("%s/activities/%s", base, newUUID())
		followID := fmt.Sprintf("%s/activities/%s", base, newUUID()) // reconstructed follow ID

		undoActivity := map[string]interface{}{
			"@context": "https://www.w3.org/ns/activitystreams",
			"id":       activityID,
			"type":     "Undo",
			"actor":    localActorURL,
			"object": map[string]interface{}{
				"id":     followID,
				"type":   "Follow",
				"actor":  localActorURL,
				"object": remoteUser.ActorID,
			},
		}

		if sendErr := s.SendAPActivity(ctx, inboxURL, undoActivity, localUser.PrivateKeyPem, localActorURL+"#main-key"); sendErr != nil {
			log.Printf("[AP Unfollow] Warning - failed to send Undo Follow to %s: %v", inboxURL, sendErr)
			// Continue — clear local record regardless
		} else {
			log.Printf("[AP Unfollow] Sent Undo Follow to %s inbox: %s", remoteUser.ActorID, inboxURL)
		}
	}

	// Remove local RemoteFollow record
	if removeErr := s.relationshipsRepo.RemoveRemoteFollow(ctx, localUserID, remoteUser.ActorID, remoteUser.Username, remoteUser.Instance); removeErr != nil {
		log.Printf("[AP Unfollow] Warning - failed to remove local follow record: %v", removeErr)
	}

	return nil
}

// ---------------------------------------------------------------------------
// Part 4 — Signed HTTP delivery
// ---------------------------------------------------------------------------

// SendAPActivity sends a signed ActivityPub JSON activity to a remote inbox.
//   - targetInbox: full URL of the remote inbox (e.g. https://mastodon.social/users/alice/inbox)
//   - activity:    map to be JSON-encoded as the request body
//   - privateKeyPem: PEM-encoded RSA private key of the sending actor
//   - keyID:       the public key URL (e.g. https://yourdomain/users/bob#main-key)
func (s *FederationService) SendAPActivity(ctx context.Context, targetInbox string, activity map[string]interface{}, privateKeyPem, keyID string) error {
	payload, err := json.Marshal(activity)
	if err != nil {
		return fmt.Errorf("failed to marshal AP activity: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", targetInbox, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/activity+json")
	req.Header.Set("Accept", "application/activity+json")

	// Sign if we have a private key
	if privateKeyPem != "" {
		privKey, err := ParseRSAPrivateKey(privateKeyPem)
		if err != nil {
			log.Printf("ActivityPub: Warning - failed to parse private key for signing: %v", err)
		} else {
			if err := SignRequest(req, keyID, privKey); err != nil {
				log.Printf("ActivityPub: Warning - failed to sign request: %v", err)
			}
		}
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to POST to %s: %w", targetInbox, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("remote inbox %s returned %d: %s", targetInbox, resp.StatusCode, string(body))
	}

	return nil
}

// FetchRemotePublicKey fetches the public key of an AP actor by keyID.
// keyID is typically the actor URL with fragment, e.g. https://mastodon.social/users/alice#main-key
// Used by the HTTP Signature verifier.
func (s *FederationService) FetchRemotePublicKey(ctx context.Context, keyID string) (string, error) {
	// Strip fragment to get actor URL
	actorURL := keyID
	if idx := strings.Index(keyID, "#"); idx > 0 {
		actorURL = keyID[:idx]
	}

	actor, err := s.FetchRemoteActor(ctx, actorURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch actor for key %s: %w", keyID, err)
	}

	if actor.PublicKey.PublicKeyPem == "" {
		return "", fmt.Errorf("actor %s has no publicKeyPem", actorURL)
	}
	return actor.PublicKey.PublicKeyPem, nil
}

// extractDomain parses the domain from a full URL string.
func extractDomain(rawURL string) string {
	s := rawURL
	s = strings.TrimPrefix(s, "https://")
	s = strings.TrimPrefix(s, "http://")
	if idx := strings.IndexByte(s, '/'); idx > 0 {
		return s[:idx]
	}
	return s
}

// newUUID returns a random UUID string using crypto/rand.
func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%12x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// ---------------------------------------------------------------------------
// Handler-support service methods  (called by activitypub_handler.go)
// ---------------------------------------------------------------------------

// GetUserByUsername returns a local user by username. Used by the AP inbox to
// determine which local account an incoming Follow targets.
func (s *FederationService) GetUserByUsername(ctx context.Context, username string) (*userResult, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found: %s", username)
	}
	return &userResult{
		ID:            user.ID,
		Username:      user.Username,
		PrivateKeyPem: user.PrivateKeyPem,
	}, nil
}

// GetUserWithKeyPair fetches a local user by ID, ensures they have an RSA keypair,
// and returns the full User model (with PrivateKeyPem populated).
// Used by post_service.go to sign ActivityPub Create activities.
func (s *FederationService) GetUserWithKeyPair(ctx context.Context, userID primitive.ObjectID) (*userResult, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found: %s", userID.Hex())
	}
	user, err = s.userRepo.EnsureKeyPair(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to ensure keypair: %w", err)
	}
	return &userResult{
		ID:            user.ID,
		Username:      user.Username,
		PrivateKeyPem: user.PrivateKeyPem,
	}, nil
}

// userResult is a minimal projection of a local user for ActivityPub use.
type userResult struct {
	ID            interface{ Hex() string }
	Username      string
	PrivateKeyPem string
}

// StoreRemoteFollower upserts a remote follower record for a local user.
// Always uses the canonical actor.ID from the fetched actor JSON, not the raw payload actor field.
func (s *FederationService) StoreRemoteFollower(ctx context.Context, localUserID interface{ Hex() string }, rawActorID, username, instance string) error {
	objectID, err := primitive.ObjectIDFromHex(localUserID.Hex())
	if err != nil {
		return err
	}

	// Fetch the actor JSON to get the canonical ID, inbox, and public key.
	// This is the critical step: the raw actorID from the inbox payload may be
	// a localhost URL (e.g. http://localhost:8081/users/x). We use actor.ID instead.
	actFetchCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	canonicalActorID := rawActorID // fallback if fetch fails
	inboxURL := ""
	sharedInboxURL := ""
	publicKeyPem := ""
	displayName := username

	actor, fetchErr := s.FetchRemoteActor(actFetchCtx, rawActorID)
	if fetchErr != nil {
		log.Printf("[AP Follow] Warning - could not fetch actor %s: %v — using raw actorID as fallback", rawActorID, fetchErr)
	} else {
		// Use the canonical actor.ID (not the raw inbox actor field)
		canonicalActorID = actor.ID
		inboxURL = actor.Inbox
		publicKeyPem = actor.PublicKey.PublicKeyPem
		if actor.PreferredUsername != "" {
			username = actor.PreferredUsername
		}
		if actor.Name != "" {
			displayName = actor.Name
		}
		if actor.ID != "" {
			instance = extractDomain(actor.ID)
		}
		sharedInboxURL = extractSharedInbox(actFetchCtx, s, canonicalActorID)
	}

	// Upsert into remote_users with full actor details
	remoteUser := &models.RemoteUser{
		ActorID:        canonicalActorID,
		Username:       username,
		DisplayName:    displayName,
		Instance:       instance,
		InboxURL:       inboxURL,
		SharedInboxURL: sharedInboxURL,
		PublicKeyPem:   publicKeyPem,
		FetchedAt:      time.Now(),
		CreatedAt:      time.Now(),
	}
	if actor != nil && actor.Icon != nil {
		remoteUser.AvatarURL = actor.Icon.URL
	}
	if err := s.remoteUserRepo.UpsertRemoteUser(ctx, remoteUser); err != nil {
		log.Printf("[AP Follow] Warning - upsert remote user failed: %v", err)
	}

	// Record the follower relationship using the canonical actor ID
	follower := &models.RemoteFollower{
		LocalUserID:    objectID,
		RemoteActorID:  canonicalActorID,
		RemoteUsername: username,
		RemoteInstance: instance,
		InboxURL:       inboxURL,
		SharedInboxURL: sharedInboxURL,
		FollowStatus:   "accepted",
		CreatedAt:      time.Now(),
	}

	log.Printf("[AP Follow] Stored follower: canonical=%s raw=%s inbox=%s sharedInbox=%s",
		canonicalActorID, rawActorID, inboxURL, sharedInboxURL)
	return s.relationshipsRepo.AddRemoteFollower(ctx, follower)
}

// MarkFollowAccepted marks a pending RemoteFollower as accepted when we receive an Accept.
func (s *FederationService) MarkFollowAccepted(ctx context.Context, remoteActorID string) {
	if err := s.relationshipsRepo.UpdateRemoteFollowStatus(ctx, remoteActorID, "accepted"); err != nil {
		log.Printf("[AP Accept] Warning - failed to mark follow accepted for %s: %v", remoteActorID, err)
		return
	}
	log.Printf("[AP Accept] Follow from %s marked as accepted", remoteActorID)
}

// RemoveRemoteFollowerByActorID removes a remote follower when we receive Undo/Follow.
func (s *FederationService) RemoveRemoteFollowerByActorID(ctx context.Context, actorID string) {
	if err := s.relationshipsRepo.RemoveRemoteFollowerByActorID(ctx, actorID); err != nil {
		log.Printf("[AP Undo] Warning - failed to remove follower %s: %v", actorID, err)
		return
	}
	log.Printf("[AP Undo] Removed follower: %s", actorID)
}

// extractSharedInbox fetches the raw actor JSON and extracts endpoints.sharedInbox.
func extractSharedInbox(ctx context.Context, s *FederationService, actorURL string) string {
	req, err := http.NewRequestWithContext(ctx, "GET", actorURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("Accept", "application/activity+json")
	resp, err := s.httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return ""
	}
	defer resp.Body.Close()

	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return ""
	}
	if endpoints, ok := raw["endpoints"].(map[string]interface{}); ok {
		if shared, ok := endpoints["sharedInbox"].(string); ok {
			return shared
		}
	}
	return ""
}

// StoreRemotePost stores a remote AP Note object in the remote_posts collection.
func (s *FederationService) StoreRemotePost(ctx context.Context, postID, actorID, username, instance, content string, createdAt time.Time) error {
	remotePost := &models.RemotePost{
		RemotePostID:   postID,
		AuthorActorID:  actorID,
		Author:         username,
		OriginInstance: instance,
		Content:        content,
		ReceivedAt:     time.Now(),
		CreatedAt:      createdAt,
	}
	return s.remotePostRepo.UpsertRemotePost(ctx, remotePost)
}

// IncrementRemotePostLike increments the like_count on a cached remote post.
func (s *FederationService) IncrementRemotePostLike(ctx context.Context, remotePostID string) {
	if err := s.remotePostRepo.IncrementLikeCount(ctx, remotePostID); err != nil {
		log.Printf("ActivityPub: IncrementRemotePostLike failed for %s: %v", remotePostID, err)
	}
}

// DecrementRemotePostLike decrements the like_count on a cached remote post.
func (s *FederationService) DecrementRemotePostLike(ctx context.Context, remotePostID string) {
	if err := s.remotePostRepo.DecrementLikeCount(ctx, remotePostID); err != nil {
		log.Printf("ActivityPub: DecrementRemotePostLike failed for %s: %v", remotePostID, err)
	}
}

// GetRemotePostByObjectID returns a cached remote post by its MongoDB ObjectID.
// Used when the frontend sends the MongoDB _id (not the AP URL) of a cached remote post.
func (s *FederationService) GetRemotePostByObjectID(ctx context.Context, id primitive.ObjectID) (*models.RemotePost, error) {
	return s.remotePostRepo.GetRemotePostByObjectID(ctx, id)
}

// StoreRemoteBoost stores an Announce (boost) as a RemotePost referencing the original.
func (s *FederationService) StoreRemoteBoost(ctx context.Context, actorID, boostedPostID string) {
	remotePost := &models.RemotePost{
		RemotePostID:   fmt.Sprintf("%s/boost-%s", actorID, newUUID()),
		AuthorActorID:  actorID,
		Author:         extractDomain(actorID),
		OriginInstance: extractDomain(actorID),
		Content:        fmt.Sprintf("Boosted: %s", boostedPostID),
		ReceivedAt:     time.Now(),
		CreatedAt:      time.Now(),
	}
	if err := s.remotePostRepo.UpsertRemotePost(ctx, remotePost); err != nil {
		log.Printf("ActivityPub: StoreRemoteBoost failed: %v", err)
	}
}

// DeleteRemotePostByID deletes a remote post by its AP ID.
func (s *FederationService) DeleteRemotePostByID(ctx context.Context, postID string) {
	if err := s.remotePostRepo.DeleteRemotePost(ctx, postID); err != nil {
		log.Printf("ActivityPub: DeleteRemotePostByID %s failed: %v", postID, err)
	}
}

// DeleteRemotePostByLocalID deletes a remote post from the local cache by its MongoDB ObjectID.
func (s *FederationService) DeleteRemotePostByLocalID(ctx context.Context, id primitive.ObjectID) error {
	return s.remotePostRepo.DeleteRemotePostByLocalID(ctx, id)
}

// SendRemoteLike builds an AP Like activity and delivers it to the remote actor's inbox.
// Falls back to the retry queue if the inbox is unreachable.
func (s *FederationService) SendRemoteLike(ctx context.Context, localUsername, privateKeyPem, keyID string, remotePost *models.RemotePost) {
	base := config.AppConfig.BaseURL()
	localActorURL := fmt.Sprintf("%s/users/%s", base, localUsername)
	activityID := fmt.Sprintf("%s/activities/like-%s", base, newUUID())

	likeActivity := map[string]interface{}{
		"@context": "https://www.w3.org/ns/activitystreams",
		"id":       activityID,
		"type":     "Like",
		"actor":    localActorURL,
		"object":   remotePost.RemotePostID,
	}

	inboxURL := s.resolveInboxForActorID(ctx, remotePost.AuthorActorID)
	if inboxURL == "" {
		log.Printf("[AP Like] No inbox URL for actor %s — queuing for retry", remotePost.AuthorActorID)
		_ = s.enqueueAPActivity(ctx, "", likeActivity, privateKeyPem, keyID, remotePost.OriginInstance)
		return
	}

	go func() {
		deliverCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := s.SendAPActivity(deliverCtx, inboxURL, likeActivity, privateKeyPem, keyID); err != nil {
			log.Printf("[AP Like] Delivery failed to %s: %v — queuing for retry", inboxURL, err)
			_ = s.enqueueAPActivity(context.Background(), inboxURL, likeActivity, privateKeyPem, keyID, remotePost.OriginInstance)
		} else {
			log.Printf("[AP Like] Delivered Like to %s", inboxURL)
		}
	}()
}

// SendRemoteComment builds an AP Create{Note, inReplyTo} activity and delivers it
// to the remote actor's inbox. Falls back to the retry queue on failure.
func (s *FederationService) SendRemoteComment(ctx context.Context, localUsername, privateKeyPem, keyID, commentContent, commentObjectID string, remotePost *models.RemotePost) {
	base := config.AppConfig.BaseURL()
	localActorURL := fmt.Sprintf("%s/users/%s", base, localUsername)
	noteID := fmt.Sprintf("%s/users/%s/comments/%s", base, localUsername, commentObjectID)
	activityID := fmt.Sprintf("%s/activities/create-%s", base, commentObjectID)

	note := map[string]interface{}{
		"type":         "Note",
		"id":           noteID,
		"attributedTo": localActorURL,
		"content":      commentContent,
		"inReplyTo":    remotePost.RemotePostID,
		"published":    time.Now().UTC().Format(time.RFC3339),
		"to":           []string{"https://www.w3.org/ns/activitystreams#Public"},
	}
	createActivity := map[string]interface{}{
		"@context":  "https://www.w3.org/ns/activitystreams",
		"id":        activityID,
		"type":      "Create",
		"actor":     localActorURL,
		"published": time.Now().UTC().Format(time.RFC3339),
		"to":        []string{"https://www.w3.org/ns/activitystreams#Public"},
		"object":    note,
	}

	inboxURL := s.resolveInboxForActorID(ctx, remotePost.AuthorActorID)
	if inboxURL == "" {
		log.Printf("[AP Comment] No inbox for actor %s — queuing for retry", remotePost.AuthorActorID)
		_ = s.enqueueAPActivity(ctx, "", createActivity, privateKeyPem, keyID, remotePost.OriginInstance)
		return
	}

	go func() {
		deliverCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := s.SendAPActivity(deliverCtx, inboxURL, createActivity, privateKeyPem, keyID); err != nil {
			log.Printf("[AP Comment] Delivery failed to %s: %v — queuing for retry", inboxURL, err)
			_ = s.enqueueAPActivity(context.Background(), inboxURL, createActivity, privateKeyPem, keyID, remotePost.OriginInstance)
		} else {
			log.Printf("[AP Comment] Delivered Create{Note} to %s", inboxURL)
		}
	}()
}

// resolveInboxForActorID looks up a remote user's inbox URL from cache,
// falling back to a live actor fetch on cache miss.
func (s *FederationService) resolveInboxForActorID(ctx context.Context, actorID string) string {
	cached, err := s.remoteUserRepo.GetRemoteUsersByActorIDs(ctx, []string{actorID})
	if err == nil {
		if ru, ok := cached[actorID]; ok && ru.InboxURL != "" {
			return ru.InboxURL
		}
	}
	fetchCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	actor, fetchErr := s.FetchRemoteActor(fetchCtx, actorID)
	if fetchErr == nil && actor.Inbox != "" {
		return actor.Inbox
	}
	return ""
}

// enqueueAPActivity persists an AP activity in the federation_events collection
// so it can be retried by StartRetryWorker.
func (s *FederationService) enqueueAPActivity(ctx context.Context, inboxURL string, activity map[string]interface{}, privateKeyPem, keyID, targetInstance string) error {
	activityType, _ := activity["type"].(string)
	// Clone and annotate with delivery metadata
	payload := make(bson.M)
	for k, v := range activity {
		payload[k] = v
	}
	payload["_inbox_url"] = inboxURL
	payload["_private_key_pem"] = privateKeyPem
	payload["_key_id"] = keyID

	event := &models.FederationEvent{
		Type:           activityType,
		TargetInstance: targetInstance,
		Payload:        payload,
		Status:         "pending",
	}
	return s.eventRepo.CreateEvent(ctx, event)
}

// StartRetryWorker launches a background goroutine that periodically retries failed AP
// deliveries stored in the federation_events collection.
// Max 5 retries; uses exponential back-off: 2^n minutes between attempts.
func (s *FederationService) StartRetryWorker(ctx context.Context) {
	const maxRetries = 5
	const tickInterval = 30 * time.Second

	log.Printf("[RetryWorker] Started (interval=%s, maxRetries=%d)", tickInterval, maxRetries)

	go func() {
		ticker := time.NewTicker(tickInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Printf("[RetryWorker] Shutting down")
				return
			case <-ticker.C:
				s.processRetryQueue(ctx, maxRetries)
			}
		}
	}()
}

// processRetryQueue fetches pending/failed events and attempts delivery for each.
func (s *FederationService) processRetryQueue(ctx context.Context, maxRetries int) {
	pending, _ := s.eventRepo.GetPendingEvents(ctx)
	failed, _ := s.eventRepo.GetFailedEvents(ctx, maxRetries)
	events := append(pending, failed...)
	if len(events) == 0 {
		return
	}
	log.Printf("[RetryWorker] Processing %d event(s)", len(events))

	for _, event := range events {
		// Exponential back-off
		if event.LastAttempt != nil {
			backOff := time.Duration(1<<uint(event.RetryCount)) * time.Minute
			if time.Since(*event.LastAttempt) < backOff {
				continue
			}
		}

		inboxURL, _ := event.Payload["_inbox_url"].(string)
		privateKeyPem, _ := event.Payload["_private_key_pem"].(string)
		keyID, _ := event.Payload["_key_id"].(string)

		if inboxURL == "" {
			_ = s.eventRepo.MarkEventFailed(ctx, event.ID, "no inbox URL available")
			continue
		}

		// Rebuild activity (strip internal metadata fields)
		activity := make(map[string]interface{})
		for k, v := range event.Payload {
			if k != "_inbox_url" && k != "_private_key_pem" && k != "_key_id" {
				activity[k] = v
			}
		}

		deliverCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		err := s.SendAPActivity(deliverCtx, inboxURL, activity, privateKeyPem, keyID)
		cancel()

		if err != nil {
			log.Printf("[RetryWorker] Attempt %d failed → %s: %v", event.RetryCount+1, inboxURL, err)
			_ = s.eventRepo.MarkEventFailed(ctx, event.ID, err.Error())
		} else {
			log.Printf("[RetryWorker] Delivered on attempt %d → %s", event.RetryCount+1, inboxURL)
			_ = s.eventRepo.MarkEventSent(ctx, event.ID)
		}
	}
}

// ---------------------------------------------------------------------------
// Part 5 — Push-based delivery of Create activities
// ---------------------------------------------------------------------------

// DeliverActivityToFollowers sends an AP activity to all remote followers of a local user.
// It deduplicates by sharedInbox (preferred) or inbox, and uses a 10s timeout per request.
// Errors per inbox are logged but never crash the caller.
func (s *FederationService) DeliverActivityToFollowers(ctx context.Context, localUsername, privateKeyPem, keyID string, localUserID primitive.ObjectID, activity map[string]interface{}) {
	followers, err := s.relationshipsRepo.GetAcceptedFollowers(ctx, localUserID)
	if err != nil {
		log.Printf("[AP Deliver] Failed to load followers for %s: %v", localUsername, err)
		return
	}
	if len(followers) == 0 {
		log.Printf("[AP Deliver] No followers for %s — skipping delivery", localUsername)
		return
	}

	// Deduplicate by inbox URL: prefer sharedInbox over per-user inbox
	seen := make(map[string]bool)
	var inboxes []string
	for _, f := range followers {
		target := f.SharedInboxURL
		if target == "" {
			target = f.InboxURL
		}
		if target != "" && !seen[target] {
			seen[target] = true
			inboxes = append(inboxes, target)
		}
	}

	log.Printf("[AP Deliver] Delivering to %d inbox(es) for %s", len(inboxes), localUsername)

	for _, inbox := range inboxes {
		deliverCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		err := s.SendAPActivity(deliverCtx, inbox, activity, privateKeyPem, keyID)
		cancel()
		if err != nil {
			log.Printf("[AP Deliver] FAILED → %s : %v", inbox, err)
		} else {
			log.Printf("[AP Deliver] OK → %s", inbox)
		}
	}
}

// ---------------------------------------------------------------------------
// Part 6 — Followers Collection endpoint
// ---------------------------------------------------------------------------

// GetFollowersCollection returns an AP OrderedCollection of remote follower actor IDs
// for the given local username.
func (s *FederationService) GetFollowersCollection(ctx context.Context, username string) (map[string]interface{}, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found: %s", username)
	}

	followers, err := s.relationshipsRepo.GetRemoteFollowers(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to load followers: %w", err)
	}

	base := config.AppConfig.BaseURL()
	collectionID := fmt.Sprintf("%s/users/%s/followers", base, username)

	var items []string
	for _, f := range followers {
		items = append(items, f.RemoteActorID)
	}

	return map[string]interface{}{
		"@context":     "https://www.w3.org/ns/activitystreams",
		"id":           collectionID,
		"type":         "OrderedCollection",
		"totalItems":   len(items),
		"orderedItems": items,
	}, nil
}

// ---------------------------------------------------------------------------
// Part 7 — Outbox endpoint
// ---------------------------------------------------------------------------

// OutboxActivity wraps a local post as an AP Create+Note activity for the outbox.
type OutboxActivity struct {
	ID        string
	Content   string
	Published time.Time
}

// GetOutboxActivities builds an AP OrderedCollection from a local user's recent posts.
// It accepts a list of OutboxActivity items (fetched by the handler from the post service).
func (s *FederationService) BuildOutboxCollection(ctx context.Context, username string, posts []OutboxActivity) (map[string]interface{}, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user not found: %s", username)
	}

	base := config.AppConfig.BaseURL()
	actorURL := fmt.Sprintf("%s/users/%s", base, username)
	outboxURL := actorURL + "/outbox"

	var items []map[string]interface{}
	for _, p := range posts {
		noteID := fmt.Sprintf("%s/users/%s/posts/%s", base, username, p.ID)
		createID := fmt.Sprintf("%s/activities/create-%s", base, p.ID)
		note := map[string]interface{}{
			"type":         "Note",
			"id":           noteID,
			"attributedTo": actorURL,
			"content":      p.Content,
			"published":    p.Published.UTC().Format(time.RFC3339),
			"to":           []string{"https://www.w3.org/ns/activitystreams#Public"},
		}
		create := map[string]interface{}{
			"@context":  "https://www.w3.org/ns/activitystreams",
			"type":      "Create",
			"id":        createID,
			"actor":     actorURL,
			"published": p.Published.UTC().Format(time.RFC3339),
			"to":        []string{"https://www.w3.org/ns/activitystreams#Public"},
			"object":    note,
		}
		items = append(items, create)
	}

	if items == nil {
		items = []map[string]interface{}{}
	}

	return map[string]interface{}{
		"@context":     "https://www.w3.org/ns/activitystreams",
		"id":           outboxURL,
		"type":         "OrderedCollection",
		"totalItems":   len(items),
		"orderedItems": items,
	}, nil
}

// ---------------------------------------------------------------------------
// Part 8 — Federated resolve endpoint
// ---------------------------------------------------------------------------

// ResolveAPHandle resolves a federated handle (@user@domain) or a local username.
// For remote handles: WebFinger → FetchActor → UpsertRemoteUser (with 24h cache).
// For local names (no domain): returns the local user as an AP actor.
// Returns a normalised map suitable for JSON response.
func (s *FederationService) ResolveAPHandle(ctx context.Context, handle string) (map[string]interface{}, error) {
	handle = strings.TrimPrefix(handle, "@")
	parts := strings.SplitN(handle, "@", 2)

	// Local user only — no domain
	if len(parts) == 1 || parts[1] == "" || parts[1] == config.AppConfig.InstanceDomain {
		username := parts[0]
		return s.BuildActorJSON(ctx, username)
	}

	username, domain := parts[0], parts[1]
	actorID := fmt.Sprintf("https://%s/users/%s", domain, username)

	// Check cache (skip remote fetch if cached within 24h)
	cached, _ := s.remoteUserRepo.GetRemoteUsersByActorIDs(ctx, []string{actorID})
	if ru, ok := cached[actorID]; ok && time.Since(ru.FetchedAt) < 24*time.Hour {
		log.Printf("[AP Resolve] Cache hit for %s (fetched %s ago)", actorID, time.Since(ru.FetchedAt).Round(time.Minute))
		return remoteUserToMap(ru), nil
	}

	// Fetch via WebFinger
	log.Printf("[AP Resolve] Fetching remote handle @%s@%s", username, domain)
	actor, err := s.WebFingerResolveHandle(ctx, handle)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve @%s@%s: %w", username, domain, err)
	}

	// Upsert into remote_users
	ru := &models.RemoteUser{
		ActorID:      actor.ID,
		Username:     actor.PreferredUsername,
		DisplayName:  actor.Name,
		Instance:     extractDomain(actor.ID),
		Bio:          actor.Summary,
		InboxURL:     actor.Inbox,
		PublicKeyPem: actor.PublicKey.PublicKeyPem,
		FetchedAt:    time.Now(),
		CreatedAt:    time.Now(),
	}
	if actor.Icon != nil {
		ru.AvatarURL = actor.Icon.URL
	}
	if err := s.remoteUserRepo.UpsertRemoteUser(ctx, ru); err != nil {
		log.Printf("[AP Resolve] Warning - failed to cache remote user: %v", err)
	}

	log.Printf("[AP Resolve] Resolved and cached @%s@%s → %s", username, domain, actor.ID)
	return remoteUserToMap(ru), nil
}

// remoteUserToMap converts a RemoteUser to a map for JSON response.
// remoteUserToMap converts a RemoteUser to a normalized response map.
// Always returns username (preferredUsername), display_name (name), handle (@user@domain), domain.
// Never returns numeric actor IDs as the username.
func remoteUserToMap(ru *models.RemoteUser) map[string]interface{} {
	handle := ""
	if ru.Username != "" && ru.Instance != "" {
		handle = "@" + ru.Username + "@" + ru.Instance
	}
	return map[string]interface{}{
		// canonical AP identifier
		"actor_id": ru.ActorID,
		"id":       ru.ActorID,
		// display fields
		"username":     ru.Username,
		"displayName":  ru.DisplayName,
		"display_name": ru.DisplayName,
		// federation routing
		"instance": ru.Instance,
		"domain":   ru.Instance,
		"handle":   handle,
		// profile
		"avatar_url": ru.AvatarURL,
		"bio":        ru.Bio,
		"inbox_url":  ru.InboxURL,
		"fetched_at": ru.FetchedAt.UTC().Format(time.RFC3339),
	}
}
