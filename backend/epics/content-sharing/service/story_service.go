package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	authRepo "federated-social/backend/epics/identity/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StoryService struct {
	repo     *repository.StoryRepository
	userRepo *authRepo.UserRepository
}

func NewStoryService() *StoryService {
	return &StoryService{
		repo:     repository.NewStoryRepository(),
		userRepo: authRepo.NewUserRepository(), // Assume this exists and is accessible
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
