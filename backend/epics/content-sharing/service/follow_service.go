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

	"go.mongodb.org/mongo-driver/bson/primitive"

	safetyRepo "federated-social/backend/epics/safety/repository"
	safetyService "federated-social/backend/epics/safety/service"
)

type FollowService struct {
	followRepo        *repository.FollowRepository
	userRepo          *identityRepo.UserRepository
	notificationRepo  *repository.NotificationRepository
	blockService      *safetyService.BlockService
	federationService *federationService.FederationService
	remoteUserRepo    *federationRepo.RemoteUserRepository
}

func NewFollowService() *FollowService {
	var fedService *federationService.FederationService
	if config.AppConfig.FederationEnabled {
		fedService = federationService.NewFederationService()
	}

	return &FollowService{
		followRepo:        repository.NewFollowRepository(),
		userRepo:          identityRepo.NewUserRepository(),
		notificationRepo:  repository.NewNotificationRepository(),
		blockService:      safetyService.NewBlockService(safetyRepo.NewBlockRepository()),
		federationService: fedService,
		remoteUserRepo:    federationRepo.NewRemoteUserRepository(),
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
	_, err := s.userRepo.FindByID(ctx, followingID)
	if err == nil {
		// Local Follow Logic
		isBlocked, _ := s.blockService.IsBlocked(ctx, followerID, followingID)
		if isBlocked {
			return errors.New("cannot follow: user has blocked you or you have blocked them")
		}

		if isFollowing, _ := s.followRepo.IsFollowing(ctx, followerID, followingID); isFollowing {
			return nil
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
			// Federated Follow
			return s.federationService.FollowRemoteUser(ctx, followerID, remoteUser)
		}
	}

	return errors.New("user not found")
}

// Unfollow removes a follow relationship
func (s *FollowService) Unfollow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
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
