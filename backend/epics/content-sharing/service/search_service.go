package service

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	"federated-social/backend/epics/content-sharing/repository"
	federationRepo "federated-social/backend/epics/federation/repository"
	federationSvc "federated-social/backend/epics/federation/service"
	identityModels "federated-social/backend/epics/identity/models"
	"log"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// federatedHandleRe matches @user@domain or user@domain
var federatedHandleRe = regexp.MustCompile(`^@?([a-zA-Z0-9_.-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$`)

type SearchService struct {
	searchRepo             *repository.SearchRepository
	followRepo             *repository.FollowRepository
	remoteRelationshipRepo *federationRepo.RemoteRelationshipsRepository
	remoteUserRepo         *federationRepo.RemoteUserRepository
	apService              *federationSvc.FederationService // nil if AP disabled
}

func NewSearchService() *SearchService {
	var apSvc *federationSvc.FederationService
	if config.AppConfig != nil && config.AppConfig.ActivityPubEnabled {
		apSvc = federationSvc.NewFederationService()
	}
	return &SearchService{
		searchRepo:             repository.NewSearchRepository(),
		followRepo:             repository.NewFollowRepository(),
		remoteRelationshipRepo: federationRepo.NewRemoteRelationshipsRepository(),
		remoteUserRepo:         federationRepo.NewRemoteUserRepository(),
		apService:              apSvc,
	}
}

// getUserKey generates a consistent key for deduplication across local and remote results.
func getUserKey(user identityModels.PublicUser) string {
	username := strings.ToLower(user.Username)
	domain := strings.ToLower(user.InstanceID)

	// Normalize local and internal domains to "local" for consistent matching
	if domain == "" || domain == strings.ToLower(config.AppConfig.InstanceDomain) ||
		strings.Contains(domain, "localhost") || strings.Contains(domain, "backend") ||
		strings.Contains(domain, "community-1") {
		domain = "local"
	} else if strings.Contains(domain, "community-2") {
		// Specific mapping for the other test community if it's treated as "remote" but we want consistency
		domain = "local-2"
	}

	return username + "@" + domain
}

func (s *SearchService) mapInstanceToName(url string) string {
	if url == "" {
		return ""
	}
	// Map localhost:8080 and Docker internal backend:8080 to community-1
	if strings.Contains(url, "localhost:8080") || strings.Contains(url, "backend:8080") || strings.Contains(url, "community-1") {
		return "community-1"
	}
	// Map localhost:8081 and Docker internal backend2:8080 to community-2
	if strings.Contains(url, "localhost:8081") || strings.Contains(url, "backend2:8080") || strings.Contains(url, "community-2") {
		return "community-2"
	}
	return url
}

// SearchUsers searches for users by username with prioritization for followed users.
// If query is a federated handle (@user@domain), performs a live WebFinger resolve first.
func (s *SearchService) SearchUsers(ctx context.Context, query string, limit int64, requestingUserID *primitive.ObjectID) ([]identityModels.PublicUser, error) {
	// 0. Federated handle resolution — auto-resolve @user@domain via WebFinger
	if s.apService != nil && federatedHandleRe.MatchString(query) {
		log.Printf("[Search] Federated handle detected: %s — calling ResolveAPHandle", query)
		result, err := s.apService.ResolveAPHandle(ctx, query)
		if err != nil {
			log.Printf("[Search] ResolveAPHandle failed for %s: %v", query, err)
		} else {
			log.Printf("[Search] ResolveAPHandle succeeded for %s", query)
			// Build a PublicUser from the resolve result
			usernameStr, _ := result["username"].(string)
			displayStr, _ := result["displayName"].(string)
			instanceStr, _ := result["domain"].(string)
			avatarStr, _ := result["avatar_url"].(string)
			handleStr, _ := result["handle"].(string)
			_ = handleStr
			resolvedUser := identityModels.PublicUser{
				ID:             primitive.NilObjectID,
				Username:       usernameStr,
				DisplayName:    displayStr,
				InstanceID:     instanceStr,
				AvatarURL:      avatarStr,
				IsFollowing:    false,
				CanViewDetails: false,
			}
			// Return immediately — exact handle match has no local results to merge
			return []identityModels.PublicUser{resolvedUser}, nil
		}
	}

	// 1. Get initial local matches from searchRepo
	users, err := s.searchRepo.SearchUsers(ctx, query, limit)
	if err != nil {
		users = []identityModels.User{} // Continue anyway to show follows
	}

	// 2. Identify followed users if requester is authenticated
	followedMap := make(map[primitive.ObjectID]bool)
	remoteFollowedActorIDs := make(map[string]bool)
	var explicitFollows []identityModels.PublicUser

	if requestingUserID != nil {
		// Local Follows
		followingIDs, _ := s.followRepo.GetFollowingIDs(ctx, *requestingUserID)
		for _, id := range followingIDs {
			followedMap[id] = true
		}

		// If query is small or empty, explicitly fetch followed users to ensure they appear
		if len(followingIDs) > 0 {
			// Fetch profiles for followed users
			followedUsersMap, _ := s.searchRepo.GetUsersByIDs(ctx, followingIDs)
			for _, user := range followedUsersMap {
				// If query matches (or is empty), add to explicit list
				if query == "" || strings.Contains(strings.ToLower(user.Username), strings.ToLower(query)) ||
					strings.Contains(strings.ToLower(user.DisplayName), strings.ToLower(query)) {
					p := user.ToPublicUser()
					p.IsFollowing = true
					explicitFollows = append(explicitFollows, p)
				}
			}
		}

		// Remote Follows
		remoteFollows, _ := s.remoteRelationshipRepo.GetRemoteFollowing(ctx, *requestingUserID)
		staleThreshold := time.Now().Add(-30 * 24 * time.Hour)

		for _, f := range remoteFollows {
			remoteFollowedActorIDs[f.RemoteActorID] = true
			if query == "" || strings.Contains(strings.ToLower(f.RemoteUsername), strings.ToLower(query)) {
				// Fetch remote user details from cache
				ru, _ := s.remoteUserRepo.GetRemoteUserByActorID(ctx, f.RemoteActorID)
				if ru != nil {
					// Apply Ghost User filtering even for followed users
					if (ru.FetchedAt.IsZero() || ru.FetchedAt.Before(staleThreshold)) && ru.InboxURL == "" {
						log.Printf("[Search] Skipping stale followed remote user: %s", ru.Username)
						continue
					}
					if ru.IsDeactivated {
						continue
					}

					explicitFollows = append(explicitFollows, identityModels.PublicUser{
						ID:             ru.ID,
						Username:       ru.Username,
						DisplayName:    ru.DisplayName,
						InstanceID:     s.mapInstanceToName(ru.Instance),
						AvatarURL:      ru.AvatarURL,
						IsFollowing:    true,
						CanViewDetails: false,
					})
				} else {
					// Fallback if not in cache — but we don't have enough info to show safely if it's a ghost
					// Allow only if we have a recent follow record?
					if time.Since(f.CreatedAt) < 30*24*time.Hour {
						explicitFollows = append(explicitFollows, identityModels.PublicUser{
							ID:             primitive.NilObjectID,
							Username:       f.RemoteUsername,
							DisplayName:    f.RemoteUsername,
							InstanceID:     s.mapInstanceToName(f.RemoteInstance),
							IsFollowing:    true,
							CanViewDetails: false,
						})
					}
				}
			}
		}
	}

	// 3. Convert local matches and deduplicate with follows
	publicUsers := make([]identityModels.PublicUser, 0)
	seen := make(map[string]bool)

	// Prepend explicit follows (Dedup)
	for _, p := range explicitFollows {
		key := getUserKey(p)
		if !seen[key] {
			publicUsers = append(publicUsers, p)
			seen[key] = true
		}
	}

	// Add other local matches
	for _, user := range users {
		p := user.ToPublicUser()
		key := getUserKey(p)
		if !seen[key] {
			p.IsFollowing = followedMap[user.ID]
			publicUsers = append(publicUsers, p)
			seen[key] = true
		}
	}

	// 4. Search Remote User cache for other matches (Dedup)
	if query != "" {
		escapedQuery := regexp.QuoteMeta(strings.TrimLeft(query, "@"))
		// Users not fetched in the last 30 days are likely gone or irrelevant.
		staleThreshold := time.Now().Add(-30 * 24 * time.Hour)

		filter := bson.M{
			"$and": []bson.M{
				{
					"$or": []bson.M{
						{"username": bson.M{"$regex": escapedQuery, "$options": "i"}},
						{"display_name": bson.M{"$regex": escapedQuery, "$options": "i"}},
					},
				},
				// If fetched_at is missing or older than 30 days, we skip it
				{"fetched_at": bson.M{"$gt": primitive.NewDateTimeFromTime(staleThreshold)}},
				// Also skip deactivated remote users
				{"is_deactivated": bson.M{"$ne": true}},
			},
		}

		remoteUsersCol := database.GetCollection("remote_users")
		cursor, err := remoteUsersCol.Find(ctx, filter)
		if err == nil {
			defer cursor.Close(ctx)
			var remotes []struct {
				ID          primitive.ObjectID `bson:"_id"`
				Username    string             `bson:"username"`
				DisplayName string             `bson:"display_name"`
				ActorID     string             `bson:"actor_id"`
				Instance    string             `bson:"instance"`
				AvatarURL   string             `bson:"avatar_url"`
			}
			cursor.All(ctx, &remotes)

			for _, ru := range remotes {
				p := identityModels.PublicUser{
					ID:             ru.ID,
					Username:       ru.Username,
					DisplayName:    ru.DisplayName,
					InstanceID:     s.mapInstanceToName(ru.Instance),
					AvatarURL:      ru.AvatarURL,
					IsFollowing:    remoteFollowedActorIDs[ru.ActorID],
					CanViewDetails: false,
				}
				// Use getUserKey for consistent deduplication with explicit follows
				key := getUserKey(p)
				if !seen[key] {
					publicUsers = append(publicUsers, p)
					seen[key] = true
				}
			}
		}
	}

	// 5. Final Sort: Pre-deduplicated and Prepended is good, but let's ensure limit
	if int64(len(publicUsers)) > limit {
		publicUsers = publicUsers[:limit]
	}

	return publicUsers, nil
}
