package tests

import (
	"context"
	"errors"
	"federated-social/backend/epics/safety/models"
	"federated-social/backend/epics/safety/service"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// US4.1: Block User
func TestBlock_BlockUser(t *testing.T) {
	mockRepo := &MockBlockRepository{}
	svc := service.NewBlockService(mockRepo)

	blockerID := primitive.NewObjectID()
	blockedID := primitive.NewObjectID()

	mockRepo.BlockUserFunc = func(ctx context.Context, block *models.Block) error {
		if block.BlockerID != blockerID || block.BlockedID != blockedID {
			return errors.New("ID mismatch")
		}
		return nil
	}

	err := svc.BlockUser(context.Background(), blockerID, blockedID)
	if err != nil {
		t.Errorf("BlockUser failed: %v", err)
	}
}

func TestBlock_BlockSelf_Fail(t *testing.T) {
	mockRepo := &MockBlockRepository{}
	svc := service.NewBlockService(mockRepo)

	userID := primitive.NewObjectID()

	err := svc.BlockUser(context.Background(), userID, userID)
	if err == nil {
		t.Error("Expected error when blocking self, got nil")
	}
}

func TestBlock_UnblockUser(t *testing.T) {
	mockRepo := &MockBlockRepository{}
	svc := service.NewBlockService(mockRepo)

	blockerID := primitive.NewObjectID()
	blockedID := primitive.NewObjectID()

	mockRepo.UnblockUserFunc = func(ctx context.Context, uid1, uid2 primitive.ObjectID) error {
		if uid1 != blockerID || uid2 != blockedID {
			return errors.New("ID mismatch")
		}
		return nil
	}

	err := svc.UnblockUser(context.Background(), blockerID, blockedID)
	if err != nil {
		t.Errorf("UnblockUser failed: %v", err)
	}
}

func TestBlock_IsBlocked(t *testing.T) {
	mockRepo := &MockBlockRepository{}
	svc := service.NewBlockService(mockRepo)

	blockerID := primitive.NewObjectID()
	blockedID := primitive.NewObjectID()

	mockRepo.IsBlockedFunc = func(ctx context.Context, uid1, uid2 primitive.ObjectID) (bool, error) {
		return true, nil
	}

	blocked, err := svc.IsBlocked(context.Background(), blockerID, blockedID)
	if err != nil {
		t.Errorf("IsBlocked failed: %v", err)
	}
	if !blocked {
		t.Error("Expected blocked=true")
	}
}
