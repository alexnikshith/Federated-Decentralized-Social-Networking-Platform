package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	authRepo "federated-social/backend/epics/identity/repository"
	"log"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StoryService struct {
	repo                *repository.StoryRepository
	userRepo            *authRepo.UserRepository
	notificationService *NotificationService
}

func NewStoryService() *StoryService {
	return &StoryService{
		repo:                repository.NewStoryRepository(),
		userRepo:            authRepo.NewUserRepository(),
		notificationService: NewNotificationService(),
	}
}

func (s *StoryService) CreateStory(ctx context.Context, userID primitive.ObjectID, req dto.CreateStoryRequest) (*dto.StoryResponse, error) {
	if req.MediaURL == "" {
		return nil, errors.New("media required for stories")
	}

	story := &models.Story{
		AuthorID:  userID,
		MediaURL:  req.MediaURL,
		MediaType: req.MediaType,
		Content:   req.Content,
	}

	if err := s.repo.CreateStory(ctx, story); err != nil {
		return nil, err
	}

	// Fetch user details for the response
	user, err := s.userRepo.FindByID(ctx, userID)
	authorName := "Unknown"
	authorAvatar := ""
	if err == nil && user != nil {
		authorName = user.Username
		if user.DisplayName != "" {
			authorName = user.DisplayName
		}
		authorAvatar = user.AvatarURL
	}

	return &dto.StoryResponse{
		ID:           story.ID.Hex(),
		AuthorID:     story.AuthorID.Hex(),
		AuthorName:   authorName,
		AuthorAvatar: authorAvatar,
		MediaURL:     story.MediaURL,
		MediaType:    story.MediaType,
		Content:      story.Content,
		Likes:        story.Likes,
		CreatedAt:    story.CreatedAt,
		ExpiresAt:    story.ExpiresAt,
	}, nil
}

func (s *StoryService) GetActiveStories(ctx context.Context) ([]*dto.StoryResponse, error) {
	stories, err := s.repo.GetActiveStories(ctx)
	if err != nil {
		return nil, err
	}

	var responses []*dto.StoryResponse
	// In a real app, use Dataloader or Aggregation pipeline for user details.
	// For now, doing simple N+1 lookups (cache mapping)
	userCache := make(map[primitive.ObjectID]struct {
		Name   string
		Avatar string
	})

	for _, story := range stories {
		userInfo, exists := userCache[story.AuthorID]
		if !exists {
			user, err := s.userRepo.FindByID(ctx, story.AuthorID)
			if err == nil && user != nil {
				name := user.Username
				if user.DisplayName != "" {
					name = user.DisplayName
				}
				userInfo = struct {
					Name   string
					Avatar string
				}{Name: name, Avatar: user.AvatarURL}
				userCache[story.AuthorID] = userInfo
			}
		}

		responses = append(responses, &dto.StoryResponse{
			ID:           story.ID.Hex(),
			AuthorID:     story.AuthorID.Hex(),
			AuthorName:   userInfo.Name,
			AuthorAvatar: userInfo.Avatar,
			MediaURL:     story.MediaURL,
			MediaType:    story.MediaType,
			Content:      story.Content,
			Likes:        story.Likes,
			CreatedAt:    story.CreatedAt,
			ExpiresAt:    story.ExpiresAt,
		})
	}

	if responses == nil {
		responses = []*dto.StoryResponse{}
	}

	return responses, nil
}

func (s *StoryService) DeleteStory(ctx context.Context, storyID, userID primitive.ObjectID) error {
	story, err := s.repo.GetStoryByID(ctx, storyID)
	if err != nil {
		return errors.New("story not found")
	}

	if story.AuthorID != userID {
		return errors.New("unauthorized")
	}

	return s.repo.DeleteStory(ctx, storyID)
}

// LikeStory adds the current user's ID to the story's likes and notifies the story owner
func (s *StoryService) LikeStory(ctx context.Context, storyID, userID primitive.ObjectID) error {
	// 1. Persist the like
	if err := s.repo.LikeStory(ctx, storyID, userID.Hex()); err != nil {
		return err
	}

	// 2. Lookup story to get the owner
	story, err := s.repo.GetStoryByID(ctx, storyID)
	if err != nil || story == nil {
		return nil // Don't fail the like just because we can't notify
	}

	// Don't notify if the owner liked their own story
	if story.AuthorID == userID {
		return nil
	}

	// 3. Lookup the liker's display name + avatar for the notification
	likerUser, err := s.userRepo.FindByID(ctx, userID)
	likerName := ""
	likerAvatar := ""
	if err == nil && likerUser != nil {
		likerName = likerUser.Username
		if likerUser.DisplayName != "" {
			likerName = likerUser.DisplayName
		}
		likerAvatar = likerUser.AvatarURL
	}

	// 4. Send notification — type "story_like", entity = storyID
	if err := s.notificationService.CreateNotification(
		ctx,
		story.AuthorID, // recipient
		userID,         // actor
		"story_like",
		storyID,
		"",
		likerName,
		likerAvatar,
	); err != nil {
		log.Printf("WARNING: failed to send story_like notification: %v", err)
	}

	return nil
}

// UnlikeStory removes the current user's ID from the story's likes
func (s *StoryService) UnlikeStory(ctx context.Context, storyID, userID primitive.ObjectID) error {
	return s.repo.UnlikeStory(ctx, storyID, userID.Hex())
}

// MarkStoryViewed records that userID has viewed the given story (idempotent)
func (s *StoryService) MarkStoryViewed(ctx context.Context, storyID, userID primitive.ObjectID) error {
	return s.repo.MarkViewed(ctx, storyID, userID.Hex())
}

// GetViewedStoryIDs returns hex IDs of all active stories viewed by userID
func (s *StoryService) GetViewedStoryIDs(ctx context.Context, userID primitive.ObjectID) ([]string, error) {
	return s.repo.GetViewedStoryIDs(ctx, userID.Hex())
}

// LikerInfo carries resolved user info for a story liker
type LikerInfo struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
}

// GetStoryLikers resolves the user IDs in a story's likes to full user info
func (s *StoryService) GetStoryLikers(ctx context.Context, storyID primitive.ObjectID) ([]LikerInfo, error) {
	story, err := s.repo.GetStoryByID(ctx, storyID)
	if err != nil {
		return nil, errors.New("story not found")
	}

	likers := make([]LikerInfo, 0, len(story.Likes))
	for _, uidStr := range story.Likes {
		oid, err := primitive.ObjectIDFromHex(uidStr)
		if err != nil {
			continue
		}
		user, err := s.userRepo.FindByID(ctx, oid)
		if err != nil || user == nil {
			continue
		}
		displayName := user.Username
		if user.DisplayName != "" {
			displayName = user.DisplayName
		}
		likers = append(likers, LikerInfo{
			ID:          uidStr,
			Username:    user.Username,
			DisplayName: displayName,
			AvatarURL:   user.AvatarURL,
		})
	}

	return likers, nil
}
