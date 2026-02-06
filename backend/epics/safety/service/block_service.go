package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/safety/models"
	"federated-social/backend/epics/safety/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BlockService struct {
	repo *repository.BlockRepository
}

func NewBlockService(repo *repository.BlockRepository) *BlockService {
	return &BlockService{
		repo: repo,
	}
}

// BlockUser blocks a user
// Prevents self-blocking and creates a new block record.
func (s *BlockService) BlockUser(ctx context.Context, blockerID, blockedID primitive.ObjectID) error {
	if blockerID == blockedID {
		return errors.New("cannot block yourself")
	}

	block := &models.Block{
		BlockerID: blockerID,
		BlockedID: blockedID,
	}

	return s.repo.BlockUser(ctx, block)
}

func (s *BlockService) UnblockUser(ctx context.Context, blockerID, blockedID primitive.ObjectID) error {
	return s.repo.UnblockUser(ctx, blockerID, blockedID)
}

func (s *BlockService) GetBlockedUsers(ctx context.Context, blockerID primitive.ObjectID) ([]models.Block, error) {
	return s.repo.GetBlockedUsers(ctx, blockerID)
}

func (s *BlockService) IsBlocked(ctx context.Context, blockerID, blockedID primitive.ObjectID) (bool, error) {
	// Check unidirectional: Is blockedID blocked by blockerID?
	return s.repo.IsBlocked(ctx, blockerID, blockedID)
}

// GetHiddenUserIDs returns IDs of users whose content should be hidden from userID
func (s *BlockService) GetHiddenUserIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	return s.repo.GetBidirectionalBlockedIDs(ctx, userID)
}
