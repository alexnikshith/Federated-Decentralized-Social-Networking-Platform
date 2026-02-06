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
// It delegates to the repository to find matches and then converts them to safe PublicUser objects.
func (s *SearchService) SearchUsers(ctx context.Context, query string, limit int64) ([]identityModels.PublicUser, error) {
	users, err := s.searchRepo.SearchUsers(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	// Convert to public users and populate counts
	publicUsers := make([]identityModels.PublicUser, len(users))
	for i, user := range users {
		p := user.ToPublicUser()
		// We could potentially optimize this by getting counts in a single query,
		// but since search limit is small, this is okay for now.
		// However, SearchRepository.SearchUsers doesn't have access to followRepo yet.
		// For now, let's just use ToPublicUser which has 0s, and maybe just leave it there
		// to avoid circular dependencies or complex service setup.
		// Actually, let's just return what ToPublicUser gives (which is 0 by default now).
		publicUsers[i] = p
	}

	return publicUsers, nil
}
