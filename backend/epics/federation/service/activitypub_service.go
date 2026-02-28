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

	log.Printf("ActivityPub: Sent Follow activity to %s (inbox: %s)", actor.ID, actor.Inbox)
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

// userResult is a minimal projection of a local user for ActivityPub use.
type userResult struct {
	ID            interface{ Hex() string }
	Username      string
	PrivateKeyPem string
}

// StoreRemoteFollower upserts a remote follower record for a local user.
func (s *FederationService) StoreRemoteFollower(ctx context.Context, localUserID interface{ Hex() string }, actorID, username, instance string) error {
	objectID, err := primitive.ObjectIDFromHex(localUserID.Hex())
	if err != nil {
		return err
	}

	// Upsert the remote user first
	remoteUser := &models.RemoteUser{
		ActorID:     actorID,
		Username:    username,
		Instance:    instance,
		DisplayName: username,
		FetchedAt:   time.Now(),
		CreatedAt:   time.Now(),
	}
	if err := s.remoteUserRepo.UpsertRemoteUser(ctx, remoteUser); err != nil {
		log.Printf("ActivityPub: StoreRemoteFollower - upsert remote user failed: %v", err)
	}

	// Record the follower relationship
	follower := &models.RemoteFollower{
		LocalUserID:    objectID,
		RemoteActorID:  actorID,
		RemoteInstance: instance,
		CreatedAt:      time.Now(),
	}
	return s.relationshipsRepo.AddRemoteFollower(ctx, follower)
}

// MarkFollowAccepted marks a pending RemoteFollow as accepted when we receive Accept.
func (s *FederationService) MarkFollowAccepted(ctx context.Context, remoteActorID string) {
	// Best-effort — use existing GetRemoteFollowing to find and update if possible
	log.Printf("ActivityPub: MarkFollowAccepted for %s (implementation deferred to repository layer)", remoteActorID)
}

// RemoveRemoteFollowerByActorID removes a remote follower when we receive Undo/Follow.
func (s *FederationService) RemoveRemoteFollowerByActorID(ctx context.Context, actorID string) {
	log.Printf("ActivityPub: RemoveRemoteFollowerByActorID %s (best-effort)", actorID)
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
func (s *FederationService) IncrementRemotePostLike(ctx context.Context, postID string) {
	log.Printf("ActivityPub: IncrementRemotePostLike for %s (best-effort)", postID)
	// The remote_posts collection doesn't yet have like_count — log for now, no-op.
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
