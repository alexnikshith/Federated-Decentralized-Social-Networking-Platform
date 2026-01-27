package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/repository"
	identityModels "federated-social/backend/epics/identity/models"
)

type SearchService struct {
	searchRepo *repository.SearchRepository
}

func NewSearchService() *SearchService {
	return &SearchService{
		searchRepo: repository.NewSearchRepository(),
	}
}

// SearchUsers searches for users by username
func (s *SearchService) SearchUsers(ctx context.Context, query string, limit int64) ([]identityModels.PublicUser, error) {
	users, err := s.searchRepo.SearchUsers(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	// Convert to public users
	publicUsers := make([]identityModels.PublicUser, len(users))
	for i, user := range users {
		publicUsers[i] = user.ToPublicUser()
	}

	return publicUsers, nil
}
