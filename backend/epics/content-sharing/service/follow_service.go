package service

import (
	"context"
	"errors"
	"federated-social/backend/config"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	federationRepo "federated-social/backend/epics/federation/repository"
	federationService "federated-social/backend/epics/federation/service"
	identityModels "federated-social/backend/epics/identity/models"
	identityRepo "federated-social/backend/epics/identity/repository"
	"log"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"

	safetyRepo "federated-social/backend/epics/safety/repository"
	safetyService "federated-social/backend/epics/safety/service"
)

type FollowService struct {
	followRepo        FollowRepository
	userRepo          UserRepository
	notificationRepo  NotificationRepository
	blockService      BlockService
	federationService FederationService
	remoteUserRepo    RemoteUserRepository
	concreteFedSvc    *federationService.FederationService // concrete ref for FollowMastodonUser
}

// Internal interfaces for follow request and notification modifications
// to avoid changing the main interfaces and breaking legacy tests.
type followRequestRepo interface {
	CreateFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) error
	DeleteFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) error
	HasFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error)
	GetFollowRequestsByFollowingID(ctx context.Context, followingID primitive.ObjectID) ([]models.FollowRequest, error)
}

type notificationModifierRepo interface {
	UpdateNotificationType(ctx context.Context, userID, relatedUserID primitive.ObjectID, oldType, newType string) error
	DeleteNotificationByParams(ctx context.Context, userID, relatedUserID primitive.ObjectID, notifType string) error
}

// NewFollowService creates a new FollowService with default (concrete) dependencies
func NewFollowService() *FollowService {
	var fedService FederationService
	var concreteFed *federationService.FederationService
	if config.AppConfig.FederationEnabled {
		concreteFed = federationService.NewFederationService()
		fedService = concreteFed
	}

	return &FollowService{
		followRepo:        repository.NewFollowRepository(),
		userRepo:          identityRepo.NewUserRepository(),
		notificationRepo:  repository.NewNotificationRepository(),
		blockService:      safetyService.NewBlockService(safetyRepo.NewBlockRepository()),
		federationService: fedService,
		concreteFedSvc:    concreteFed,
		remoteUserRepo:    federationRepo.NewRemoteUserRepository(),
	}
}

// NewFollowServiceWithDeps creates a new FollowService with injected dependencies (for testing)
func NewFollowServiceWithDeps(
	followRepo FollowRepository,
	userRepo UserRepository,
	notificationRepo NotificationRepository,
	blockService BlockService,
	fedService FederationService,
	remoteUserRepo RemoteUserRepository,
) *FollowService {
	return &FollowService{
		followRepo:        followRepo,
		userRepo:          userRepo,
		notificationRepo:  notificationRepo,
		blockService:      blockService,
		federationService: fedService,
		remoteUserRepo:    remoteUserRepo,
	}
}

// GetFollowers returns list of followers for a user (both local and remote)
func (s *FollowService) GetFollowers(ctx context.Context, userID primitive.ObjectID) ([]identityModels.PublicUser, error) {
	// 1. Get local followers
	followerIDs, err := s.followRepo.GetFollowerIDs(ctx, userID)
	if err != nil {
		return nil, err
	}

	users, err := s.userRepo.FindByIDs(ctx, followerIDs)
	if err != nil {
		return nil, err
	}

	// Filter out deactivated users
	publicUsers := make([]identityModels.PublicUser, 0)
	for _, user := range users {
		if !user.IsDeactivated {
			publicUsers = append(publicUsers, user.ToPublicUser())
		}
	}

	// 2. Get remote followers (if federation is enabled)
	if s.federationService != nil {
		remoteFollowers, err := s.federationService.GetRemoteFollowers(ctx, userID)
		if err == nil {
			for _, rf := range remoteFollowers {
				// Fetch remote user details from cache
				ru, _ := s.remoteUserRepo.GetRemoteUserByActorID(ctx, rf.RemoteActorID)
				if ru != nil {
					publicUsers = append(publicUsers, identityModels.PublicUser{
						ID:             ru.ID,
						Username:       ru.Username,
						DisplayName:    ru.DisplayName,
						InstanceID:     ru.Instance,
						AvatarURL:      ru.AvatarURL,
						IsFollowing:    false, // We'd need to check if we follow them back
						CanViewDetails: false,
					})
				} else {
					// Fallback if not in cache
					name := rf.RemoteActorID
					// Try to extract username from ActorID URL
					for i := len(name) - 1; i >= 0; i-- {
						if name[i] == '/' {
							name = name[i+1:]
							break
						}
					}

					publicUsers = append(publicUsers, identityModels.PublicUser{
						ID:             primitive.NilObjectID,
						Username:       name, // Use extracted name
						DisplayName:    name,
						InstanceID:     rf.RemoteInstance,
						IsFollowing:    false,
						CanViewDetails: false,
					})
				}
			}
		}
	}

	return publicUsers, nil
}

// GetFollowing returns list of users that the given user follows (local + remote)
func (s *FollowService) GetFollowing(ctx context.Context, userID primitive.ObjectID) ([]identityModels.PublicUser, error) {
	// 1. Get local following
	followingIDs, err := s.followRepo.GetFollowingIDs(ctx, userID)
	if err != nil {
		return nil, err
	}

	users, err := s.userRepo.FindByIDs(ctx, followingIDs)
	if err != nil {
		return nil, err
	}

	publicUsers := make([]identityModels.PublicUser, 0)
	for _, user := range users {
		if !user.IsDeactivated {
			publicUsers = append(publicUsers, user.ToPublicUser())
		}
	}

	// 2. Get remote following (federated)
	if s.federationService != nil {
		remoteFollows, err := s.federationService.GetRemoteFollowing(ctx, userID)
		if err == nil {
			for _, rf := range remoteFollows {
				publicUsers = append(publicUsers, identityModels.PublicUser{
					ID:          primitive.NilObjectID,
					Username:    rf.RemoteUsername,
					DisplayName: rf.RemoteUsername, // Fallback
					InstanceID:  rf.RemoteInstance,
				})
			}
		}
	}

	return publicUsers, nil
}

// Follow creates a follow relationship
func (s *FollowService) Follow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	if followerID == followingID {
		return nil // Cannot follow yourself
	}

	// 1. Try local user first
	targetUser, err := s.userRepo.FindByID(ctx, followingID)
	if err == nil {
		// Local Follow Logic
		isBlocked, _ := s.blockService.IsBlocked(ctx, followerID, followingID)
		if isBlocked {
			return errors.New("cannot follow: user has blocked you or you have blocked them")
		}

		if isFollowing, _ := s.followRepo.IsFollowing(ctx, followerID, followingID); isFollowing {
			return nil
		}

		if targetUser.ProfileVisibility == "followers" {
			// Check if request already exists
			if frRepo, ok := s.followRepo.(followRequestRepo); ok {
				hasReq, _ := frRepo.HasFollowRequest(ctx, followerID, followingID)
				if hasReq {
					return errors.New("request already sent")
				}

				if err := frRepo.CreateFollowRequest(ctx, followerID, followingID); err != nil {
					return err
				}

				// Local Notification for request
				notification := &models.Notification{
					UserID:        followingID,
					Type:          "follow_request",
					RelatedUserID: followerID,
				}
				s.notificationRepo.CreateNotification(ctx, notification)
				return errors.New("requested")
			}
		}

		if err := s.followRepo.Follow(ctx, followerID, followingID); err != nil {
			return err
		}

		// Local Notification
		notification := &models.Notification{
			UserID:        followingID,
			Type:          "follow",
			RelatedUserID: followerID,
		}
		s.notificationRepo.CreateNotification(ctx, notification)
		return nil
	}

	// 2. Try remote user repository
	if s.federationService != nil {
		remoteUser, remoteErr := s.remoteUserRepo.GetRemoteUserByID(ctx, followingID)
		if remoteErr == nil {
			// If it's an ActivityPub user (has an inbox), we must use the signed AP flow.
			// The internal federation protocol (FollowRemoteUser) won't work for external Mastodon instances.
			if remoteUser.InboxURL != "" {
				handle := "@" + remoteUser.Username + "@" + remoteUser.Instance
				log.Printf("[Follow] Redirecting ID-based follow to Handle-based AP follow for %s", handle)
				return s.FollowByHandle(ctx, followerID, handle)
			}
			// Federated Follow (Internal protocol fallback)
			return s.federationService.FollowRemoteUser(ctx, followerID, remoteUser)
		}
	}

	return errors.New("user not found")
}

// FollowByHandle follows a user by handle ("username" or "@user@domain").
// Local handles get a direct DB follow. Remote handles use FollowMastodonUser.
func (s *FollowService) FollowByHandle(ctx context.Context, followerID primitive.ObjectID, handle string) error {
	clean := strings.TrimPrefix(handle, "@")
	parts := strings.SplitN(clean, "@", 2)
	username := parts[0]
	domain := ""
	if len(parts) == 2 {
		domain = parts[1]
	}

	// Local follow: no domain, or domain is this instance
	if domain == "" || domain == config.AppConfig.InstanceDomain {
		log.Printf("[Follow Local] %s → %s (local instance)", followerID.Hex(), username)
		target, err := s.userRepo.FindByUsername(ctx, username)
		if err != nil || target == nil {
			return errors.New("local user not found: " + username)
		}
		return s.Follow(ctx, followerID, target.ID)
	}

	// Remote follow
	if s.concreteFedSvc == nil {
		return errors.New("federation is not enabled")
	}
	fullHandle := "@" + username + "@" + domain
	log.Printf("[Follow Remote] %s → %s", followerID.Hex(), fullHandle)
	return s.concreteFedSvc.FollowMastodonUser(ctx, followerID, fullHandle)
}

// Unfollow removes a follow relationship or request
func (s *FollowService) Unfollow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	// First delete any follow request
	if frRepo, ok := s.followRepo.(followRequestRepo); ok {
		frRepo.DeleteFollowRequest(ctx, followerID, followingID)
	}

	// 1. Try local unfollow first
	err := s.followRepo.Unfollow(ctx, followerID, followingID)

	// 2. If federation enabled, also check if it's a remote user
	if s.federationService != nil {
		remoteUser, remoteErr := s.remoteUserRepo.GetRemoteUserByID(ctx, followingID)
		if remoteErr == nil {
			// Trigger federated unfollow (Undo activity)
			s.federationService.UnfollowRemoteUser(ctx, followerID, remoteUser)
			return nil // Assume success or handle specifically
		}
	}

	return err
}

// AcceptFollowRequest accepts a pending follow request
func (s *FollowService) AcceptFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	frRepo, ok := s.followRepo.(followRequestRepo)
	if !ok {
		return errors.New("follow request logic not supported by repository")
	}

	hasReq, err := frRepo.HasFollowRequest(ctx, followerID, followingID)
	if err != nil || !hasReq {
		return errors.New("follow request not found")
	}

	if err := s.followRepo.Follow(ctx, followerID, followingID); err != nil {
		return err
	}

	frRepo.DeleteFollowRequest(ctx, followerID, followingID)

	// Update the existing request notification to "follow" so it shows as a standard follow.
	if nmRepo, ok := s.notificationRepo.(notificationModifierRepo); ok {
		nmRepo.UpdateNotificationType(ctx, followingID, followerID, "follow_request", "follow")
	}

	notification := &models.Notification{
		UserID:        followerID,
		Type:          "follow_accept",
		RelatedUserID: followingID, // User B accepted user A
	}
	s.notificationRepo.CreateNotification(ctx, notification)
	return nil
}

// RejectFollowRequest rejects a pending follow request
func (s *FollowService) RejectFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	frRepo, ok := s.followRepo.(followRequestRepo)
	if !ok {
		return errors.New("follow request logic not supported by repository")
	}

	// Delete the follow request notification
	if nmRepo, ok := s.notificationRepo.(notificationModifierRepo); ok {
		nmRepo.DeleteNotificationByParams(ctx, followingID, followerID, "follow_request")
	}
	return frRepo.DeleteFollowRequest(ctx, followerID, followingID)
}

// IsFollowing checks if a user follows another
func (s *FollowService) IsFollowing(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error) {
	// 1. Check local
	isFollowing, err := s.followRepo.IsFollowing(ctx, followerID, followingID)
	if err == nil && isFollowing {
		return true, nil
	}

	// 2. Check remote
	if s.federationService != nil {
		remoteUser, remoteErr := s.remoteUserRepo.GetRemoteUserByID(ctx, followingID)
		if remoteErr == nil {
			return s.federationService.IsRemoteFollowing(ctx, followerID, remoteUser.ActorID)
		}
	}

	return false, nil
}

// CountFollowers returns total count of followers (local + remote)
func (s *FollowService) CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	localCount, err := s.followRepo.CountFollowers(ctx, userID)
	if err != nil {
		return 0, err
	}

	remoteCount := int64(0)
	if s.federationService != nil {
		remoteCount, _ = s.federationService.CountRemoteFollowers(ctx, userID)
	}

	return localCount + remoteCount, nil
}

// CountFollowing returns total count of following users (local + remote)
func (s *FollowService) CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	localCount, err := s.followRepo.CountFollowing(ctx, userID)
	if err != nil {
		return 0, err
	}

	remoteCount := int64(0)
	if s.federationService != nil {
		remoteCount, _ = s.federationService.CountRemoteFollowing(ctx, userID)
	}

	return localCount + remoteCount, nil
}

// HasFollowRequest checks if a pending follow request exists from User A to User B
func (s *FollowService) HasFollowRequest(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error) {
	if frRepo, ok := s.followRepo.(followRequestRepo); ok {
		return frRepo.HasFollowRequest(ctx, followerID, followingID)
	}
	return false, nil
}
