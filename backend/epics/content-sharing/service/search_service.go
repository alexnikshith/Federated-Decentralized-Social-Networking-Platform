package service

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/content-sharing/repository"
	federationRepo "federated-social/backend/epics/federation/repository"
	identityModels "federated-social/backend/epics/identity/models"
	"regexp"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SearchService struct {
	searchRepo             *repository.SearchRepository
	followRepo             *repository.FollowRepository
	remoteRelationshipRepo *federationRepo.RemoteRelationshipsRepository
	remoteUserRepo         *federationRepo.RemoteUserRepository
}

func NewSearchService() *SearchService {
	return &SearchService{
		searchRepo:             repository.NewSearchRepository(),
		followRepo:             repository.NewFollowRepository(),
		remoteRelationshipRepo: federationRepo.NewRemoteRelationshipsRepository(),
		remoteUserRepo:         federationRepo.NewRemoteUserRepository(),
	}
}

// getUserKey generates a consistent key for deduplication
func getUserKey(user identityModels.PublicUser) string {
	if user.ID != primitive.NilObjectID {
		return user.ID.Hex()
	}
	if user.InstanceID != "" {
		return user.Username + "@" + user.InstanceID
	}
	return user.Username
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

// SearchUsers searches for users by username with prioritization for followed users
func (s *SearchService) SearchUsers(ctx context.Context, query string, limit int64, requestingUserID *primitive.ObjectID) ([]identityModels.PublicUser, error) {
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
		for _, f := range remoteFollows {
			remoteFollowedActorIDs[f.RemoteActorID] = true
			if query == "" || strings.Contains(strings.ToLower(f.RemoteUsername), strings.ToLower(query)) {
				// Fetch remote user details from cache
				ru, _ := s.remoteUserRepo.GetRemoteUserByActorID(ctx, f.RemoteActorID)
				if ru != nil {
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
					// Fallback to basic info if not in cache
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
		filter := bson.M{
			"$or": []bson.M{
				{"username": bson.M{"$regex": escapedQuery, "$options": "i"}},
				{"display_name": bson.M{"$regex": escapedQuery, "$options": "i"}},
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
