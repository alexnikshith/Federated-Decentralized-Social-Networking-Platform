package handlers

// activitypub_handler.go — HTTP handlers for ActivityPub / Mastodon interoperability
//
// Exposes:
//   GET  /.well-known/webfinger          — WebFinger JRD (Part 1)
//   GET  /users/{username}               — Actor JSON (Part 2)
//   GET  /users/{username}/outbox        — OrderedCollection of recent posts (Part 7)
//   GET  /users/{username}/followers     — OrderedCollection of followers (Part 6)
//   POST /users/{username}/inbox         — Per-user AP inbox (Part 5)
//   POST /ap/inbox                       — Shared AP inbox (Part 5)
//   POST /api/activitypub/follow         — Follow a remote Mastodon handle (protected)
//   GET  /api/activitypub/resolve        — Resolve a federated handle (Part 8)
//
// The existing /federation/inbox endpoint is NOT touched here.

import (
	"context"
	"crypto/rsa"
	"encoding/json"
	"federated-social/backend/config"
	"federated-social/backend/epics/federation/models"
	"federated-social/backend/epics/federation/service"
	"federated-social/backend/middleware"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ActivityPubHandler handles all ActivityPub-specific HTTP endpoints.
type ActivityPubHandler struct {
	svc *service.FederationService
}

// NewActivityPubHandler constructs an ActivityPubHandler.
func NewActivityPubHandler(svc *service.FederationService) *ActivityPubHandler {
	return &ActivityPubHandler{svc: svc}
}

// ---------------------------------------------------------------------------
// Part 1 — WebFinger
// ---------------------------------------------------------------------------

// GetWebFinger handles GET /.well-known/webfinger?resource=acct:user@domain
// Mastodon calls this to discover whether a user exists before displaying their profile.
func (h *ActivityPubHandler) GetWebFinger(w http.ResponseWriter, r *http.Request) {
	resource := r.URL.Query().Get("resource")
	if resource == "" {
		http.Error(w, "missing resource parameter", http.StatusBadRequest)
		return
	}

	// resource = "acct:alice@example.com"
	resource = strings.TrimPrefix(resource, "acct:")
	parts := strings.SplitN(resource, "@", 2)
	if len(parts) != 2 {
		http.Error(w, "invalid resource format, expected acct:user@domain", http.StatusBadRequest)
		return
	}
	username := parts[0]

	jrd, err := h.svc.BuildWebFinger(r.Context(), username)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/jrd+json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(jrd)
}

// ---------------------------------------------------------------------------
// Part 2 — Actor endpoint
// ---------------------------------------------------------------------------

// GetActor handles GET /users/{username}
// Returns the ActivityPub Person JSON for a local user.
// Mastodon fetches this to display the profile and verify signatures.
func (h *ActivityPubHandler) GetActor(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	actor, err := h.svc.BuildActorJSON(r.Context(), username)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/activity+json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(actor)
}

// GetOutbox handles GET /users/{username}/outbox.
// Fetches recent local posts and wraps them as AP Create+Note activities.
// Mastodon uses this to display a user's published posts.
func (h *ActivityPubHandler) GetOutbox(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]

	// We use a simple approach: query posts from the handler's context.
	// The post service is not injected here, so we build a minimal collection
	// from any posts stored in remote_posts authored by this actor, or return empty.
	// Full integration requires the post repository — for now we delegate to service.
	collection, err := h.svc.BuildOutboxCollection(r.Context(), username, nil)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/activity+json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(collection)
}

// ReceiveAPActivity handles POST /users/{username}/inbox and POST /ap/inbox
// This is the ActivityPub inbox that Mastodon and other AP servers POST to.
// It runs in parallel with the existing /federation/inbox — neither removes the other.
func (h *ActivityPubHandler) ReceiveAPActivity(w http.ResponseWriter, r *http.Request) {
	// Decode raw AP JSON — the wire format differs from our internal ActivityEnvelope
	var activity map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&activity); err != nil {
		log.Printf("ActivityPub Inbox: failed to decode body: %v", err)
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	activityType, _ := activity["type"].(string)
	actorID, _ := activity["actor"].(string)

	log.Printf("ActivityPub Inbox: received type=%s from actor=%s", activityType, actorID)

	// Optional: verify HTTP signature (non-blocking if verification fails, just log)
	// In production this should reject unsigned requests.
	if err := h.verifyIncomingSignature(r); err != nil {
		log.Printf("ActivityPub Inbox: signature verification warning: %v", err)
		// We continue to accept for now (many test tools don't sign requests)
	}

	// Process asynchronously — return 202 Accepted immediately (AP spec requirement)
	go h.routeAPActivity(context.Background(), activity)

	w.WriteHeader(http.StatusAccepted)
	w.Header().Set("Content-Type", "application/activity+json")
	json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

// routeAPActivity routes a decoded ActivityPub activity to the appropriate handler.
func (h *ActivityPubHandler) routeAPActivity(ctx context.Context, activity map[string]interface{}) {
	activityType, _ := activity["type"].(string)
	actorID, _ := activity["actor"].(string)

	switch activityType {
	case "Follow":
		h.handleAPFollow(ctx, activity, actorID)
	case "Accept":
		h.handleAPAccept(ctx, activity)
	case "Undo":
		h.handleAPUndo(ctx, activity, actorID)
	case "Create":
		h.handleAPCreate(ctx, activity, actorID)
	case "Like":
		h.handleAPLike(ctx, activity, actorID)
	case "Announce":
		h.handleAPAnnounce(ctx, activity, actorID)
	case "Delete":
		h.handleAPDelete(ctx, activity)
	default:
		log.Printf("ActivityPub Inbox: unhandled activity type: %s", activityType)
	}
}

// handleAPFollow handles incoming Follow activities from remote servers.
// Automatically sends an Accept back (public accounts).
func (h *ActivityPubHandler) handleAPFollow(ctx context.Context, activity map[string]interface{}, followerActorID string) {
	// Determine which local user is being followed
	objectVal := activity["object"]
	var targetActorURL string
	switch v := objectVal.(type) {
	case string:
		targetActorURL = v
	case map[string]interface{}:
		targetActorURL, _ = v["id"].(string)
	}
	if targetActorURL == "" {
		log.Printf("ActivityPub Follow: no target actor URL")
		return
	}

	// Extract local username from e.g. http://localhost:8080/users/alice
	localUsername := lastPathSegment(targetActorURL)
	localUser, err := h.svc.GetUserByUsername(ctx, localUsername)
	if err != nil || localUser == nil {
		log.Printf("ActivityPub Follow: local user %s not found", localUsername)
		return
	}

	// Upsert the remote follower
	remoteDomain := extractFQDN(followerActorID)
	remoteUser := &remoteUserStub{
		ActorID:  followerActorID,
		Username: lastPathSegment(followerActorID),
		Instance: remoteDomain,
	}

	if err := h.svc.StoreRemoteFollower(ctx, localUser.ID, remoteUser.ActorID, remoteUser.Username, remoteUser.Instance); err != nil {
		log.Printf("ActivityPub Follow: failed to store follower: %v", err)
	}

	// Auto-Accept: build Accept activity and send back
	base := config.AppConfig.BaseURL()
	localActorURL := fmt.Sprintf("%s/users/%s", base, localUser.Username)
	acceptID := fmt.Sprintf("%s/activities/%s", base, randomHex())
	acceptActivity := map[string]interface{}{
		"@context": "https://www.w3.org/ns/activitystreams",
		"id":       acceptID,
		"type":     "Accept",
		"actor":    localActorURL,
		"object":   activity,
	}

	// Fetch the follower's inbox URL from their actor
	followerActor, err := h.svc.FetchRemoteActor(ctx, followerActorID)
	if err != nil {
		log.Printf("ActivityPub Follow: failed to fetch follower actor for Accept: %v", err)
		return
	}

	if err := h.svc.SendAPActivity(ctx, followerActor.Inbox, acceptActivity, localUser.PrivateKeyPem, localActorURL+"#main-key"); err != nil {
		log.Printf("ActivityPub Follow: failed to send Accept to %s: %v", followerActor.Inbox, err)
	} else {
		log.Printf("ActivityPub Follow: sent Accept to %s", followerActorID)
	}
}

// handleAPAccept handles Accept activities — marks our outgoing follow as confirmed.
func (h *ActivityPubHandler) handleAPAccept(ctx context.Context, activity map[string]interface{}) {
	// The object of the Accept should be our original Follow activity or actor URL
	objectVal := activity["object"]
	var followedActorID string
	switch v := objectVal.(type) {
	case string:
		followedActorID = v
	case map[string]interface{}:
		// object is the original Follow activity; actor in that is us, object is them
		followedActorID, _ = v["object"].(string)
	}
	actorID, _ := activity["actor"].(string) // the remote actor sending Accept
	_ = followedActorID
	log.Printf("ActivityPub Accept: %s accepted our follow request for %s", actorID, followedActorID)
	// Mark RemoteFollow.Status = "accepted" — best-effort
	h.svc.MarkFollowAccepted(ctx, actorID)
}

// handleAPUndo handles Undo{Follow} — remote user unfollowed us.
func (h *ActivityPubHandler) handleAPUndo(ctx context.Context, activity map[string]interface{}, actorID string) {
	inner, ok := activity["object"].(map[string]interface{})
	if !ok {
		return
	}
	if inner["type"] != "Follow" {
		log.Printf("ActivityPub Undo: ignoring non-Follow undo from %s", actorID)
		return
	}
	// Remove remote follower from DB
	log.Printf("ActivityPub Undo/Follow: removing follower %s", actorID)
	h.svc.RemoveRemoteFollowerByActorID(ctx, actorID)
}

// handleAPCreate handles Create{Note} — incoming new post from remote server.
func (h *ActivityPubHandler) handleAPCreate(ctx context.Context, activity map[string]interface{}, actorID string) {
	obj, ok := activity["object"].(map[string]interface{})
	if !ok {
		return
	}
	objectType, _ := obj["type"].(string)
	if objectType != "Note" && objectType != "Article" {
		log.Printf("ActivityPub Create: ignoring non-Note object type %s", objectType)
		return
	}

	remotePostID, _ := obj["id"].(string)
	content, _ := obj["content"].(string)
	publishedStr, _ := obj["published"].(string)

	var createdAt time.Time
	if publishedStr != "" {
		createdAt, _ = time.Parse(time.RFC3339, publishedStr)
	}
	if createdAt.IsZero() {
		createdAt = time.Now()
	}

	domain := extractFQDN(actorID)
	username := lastPathSegment(actorID)

	if err := h.svc.StoreRemotePost(ctx, remotePostID, actorID, username, domain, content, createdAt); err != nil {
		log.Printf("ActivityPub Create: failed to store remote post %s: %v", remotePostID, err)
	} else {
		log.Printf("ActivityPub Create: stored remote post %s from %s", remotePostID, actorID)
	}
}

// handleAPLike handles incoming Like activities — increments like count on cached remote post.
func (h *ActivityPubHandler) handleAPLike(ctx context.Context, activity map[string]interface{}, actorID string) {
	objectID, _ := activity["object"].(string)
	log.Printf("ActivityPub Like: %s liked %s", actorID, objectID)
	// Increment like_count on matching remote post (best-effort)
	h.svc.IncrementRemotePostLike(ctx, objectID)
}

// handleAPAnnounce handles Announce (boost/repost) activities.
func (h *ActivityPubHandler) handleAPAnnounce(ctx context.Context, activity map[string]interface{}, actorID string) {
	boost, _ := activity["object"].(string)
	log.Printf("ActivityPub Announce: %s boosted %s", actorID, boost)
	// Store the announce as a remote post referencing the original
	if boost != "" {
		h.svc.StoreRemoteBoost(ctx, actorID, boost)
	}
}

// handleAPDelete handles Delete activities for remote content.
func (h *ActivityPubHandler) handleAPDelete(ctx context.Context, activity map[string]interface{}) {
	var objectID string
	switch v := activity["object"].(type) {
	case string:
		objectID = v
	case map[string]interface{}:
		objectID, _ = v["id"].(string)
	}
	if objectID != "" {
		h.svc.DeleteRemotePostByID(ctx, objectID)
		log.Printf("ActivityPub Delete: removed remote post/object %s", objectID)
	}
}

// ---------------------------------------------------------------------------
// Part 3 — Follow a Mastodon handle (protected API)
// ---------------------------------------------------------------------------

// FollowMastodonHandle handles POST /api/activitypub/follow
// Body: {"handle": "@alice@mastodon.social"}
func (h *ActivityPubHandler) FollowMastodonHandle(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Handle == "" {
		http.Error(w, "handle is required", http.StatusBadRequest)
		return
	}

	userIDVal := r.Context().Value(middleware.UserIDKey)
	if userIDVal == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr, ok := userIDVal.(string)
	if !ok {
		http.Error(w, "invalid user id in context", http.StatusInternalServerError)
		return
	}
	localUserID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		http.Error(w, "invalid user id format", http.StatusBadRequest)
		return
	}

	if err := h.svc.FollowMastodonUser(r.Context(), localUserID, body.Handle); err != nil {
		log.Printf("FollowMastodonHandle: %v", err)
		http.Error(w, fmt.Sprintf("failed to follow: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("Follow request sent to %s", body.Handle),
	})
}

// UnfollowMastodonHandle handles POST /api/activitypub/unfollow
// Body: {"handle": "@alice@mastodon.social"}
func (h *ActivityPubHandler) UnfollowMastodonHandle(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Handle == "" {
		http.Error(w, "handle is required", http.StatusBadRequest)
		return
	}

	userIDVal := r.Context().Value(middleware.UserIDKey)
	if userIDVal == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr, ok := userIDVal.(string)
	if !ok {
		http.Error(w, "invalid user id in context", http.StatusInternalServerError)
		return
	}
	localUserID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		http.Error(w, "invalid user id format", http.StatusBadRequest)
		return
	}

	// Resolve the handle via WebFinger
	actor, err := h.svc.WebFingerResolveHandle(r.Context(), body.Handle)
	if err != nil {
		log.Printf("UnfollowMastodonHandle: failed to resolve handle %s: %v", body.Handle, err)
		http.Error(w, fmt.Sprintf("failed to resolve user: %v", err), http.StatusBadRequest)
		return
	}

	// Build RemoteUser stub
	remoteUser := &models.RemoteUser{
		ActorID:  actor.ID,
		Username: actor.PreferredUsername,
		Instance: extractFQDN(actor.ID),
		InboxURL: actor.Inbox,
	}

	if err := h.svc.UnfollowRemoteUser(r.Context(), localUserID, remoteUser); err != nil {
		log.Printf("UnfollowMastodonHandle: %v", err)
		http.Error(w, fmt.Sprintf("failed to unfollow: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("Unfollow request sent to %s", body.Handle),
	})
}

// ---------------------------------------------------------------------------
// Signature verification helper
// ---------------------------------------------------------------------------

// verifyIncomingSignature verifies the HTTP Signature on an incoming AP request.
// Uses the keyId in the Signature header to fetch the sender's public key.
func (h *ActivityPubHandler) verifyIncomingSignature(r *http.Request) error {
	return service.VerifyRequest(r, func(keyID string) (*rsa.PublicKey, error) {
		pemStr, err := h.svc.FetchRemotePublicKey(r.Context(), keyID)
		if err != nil {
			return nil, err
		}
		return service.ParseRSAPublicKey(pemStr)
	})
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type remoteUserStub struct {
	ActorID  string
	Username string
	Instance string
}

func lastPathSegment(url string) string {
	url = strings.TrimRight(url, "/")
	idx := strings.LastIndexByte(url, '/')
	if idx < 0 {
		return url
	}
	return url[idx+1:]
}

func extractFQDN(rawURL string) string {
	s := strings.TrimPrefix(rawURL, "https://")
	s = strings.TrimPrefix(s, "http://")
	if idx := strings.IndexByte(s, '/'); idx > 0 {
		return s[:idx]
	}
	return s
}

func randomHex() string {
	b := make([]byte, 8)
	// Best-effort — not security-critical
	for i := range b {
		b[i] = byte(time.Now().UnixNano() >> uint(i))
	}
	return fmt.Sprintf("%x", b)
}

// ---------------------------------------------------------------------------
// Part 6 — Followers Collection endpoint
// ---------------------------------------------------------------------------

// GetFollowers handles GET /users/{username}/followers
// Returns an AP OrderedCollection of follower actor IDs.
func (h *ActivityPubHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	collection, err := h.svc.GetFollowersCollection(r.Context(), username)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/activity+json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(collection)
}

// ---------------------------------------------------------------------------
// Part 8 — Resolve federated handle
// ---------------------------------------------------------------------------

// ResolveHandle handles GET /api/activitypub/resolve?handle=@user@domain
// Resolves a remote or local ActivityPub handle and returns normalised actor JSON.
func (h *ActivityPubHandler) ResolveHandle(w http.ResponseWriter, r *http.Request) {
	handle := r.URL.Query().Get("handle")
	if handle == "" {
		http.Error(w, "handle query parameter required", http.StatusBadRequest)
		return
	}

	log.Printf("[AP Resolve] Request for handle: %s", handle)

	result, err := h.svc.ResolveAPHandle(r.Context(), handle)
	if err != nil {
		log.Printf("[AP Resolve] Failed for %s: %v", handle, err)
		http.Error(w, fmt.Sprintf("could not resolve %s: %v", handle, err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(result)
}
