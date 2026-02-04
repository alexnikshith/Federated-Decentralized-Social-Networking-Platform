package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/messaging/dto"
	"federated-social/backend/epics/messaging/models"
	msgRepo "federated-social/backend/epics/messaging/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageService struct {
	repo     *msgRepo.MessageRepository
	userRepo *repository.UserRepository
}

func NewMessageService() *MessageService {
	return &MessageService{
		repo:     msgRepo.NewMessageRepository(),
		userRepo: repository.NewUserRepository(),
	}
}

func (s *MessageService) SendMessage(ctx context.Context, senderID primitive.ObjectID, req dto.SendMessageRequest) (*models.Message, error) {
	receiverID, err := primitive.ObjectIDFromHex(req.ReceiverID)
	if err != nil {
		return nil, errors.New("invalid receiver ID")
	}

	// Check if conversation exists
	participants := []primitive.ObjectID{senderID, receiverID}
	conv, err := s.repo.GetConversation(ctx, participants)
	if err != nil {
		return nil, err
	}

	if conv == nil {
		conv, err = s.repo.CreateConversation(ctx, participants)
		if err != nil {
			return nil, err
		}
	}

	msg := &models.Message{
		ConversationID: conv.ID,
		SenderID:       senderID,
		Content:        req.Content,
		Type:           models.MessageType(req.Type),
		MediaURL:       req.MediaURL,
		FileName:       req.FileName,
	}

	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		return nil, err
	}

	return msg, nil
}

func (s *MessageService) GetConversations(ctx context.Context, userID primitive.ObjectID) ([]dto.ConversationResponse, error) {
	convs, err := s.repo.GetUserConversations(ctx, userID)
	if err != nil {
		return nil, err
	}

	var responses []dto.ConversationResponse
	for _, conv := range convs {
		var participants []dto.ParticipantDTO
		for _, pID := range conv.Participants {
			user, err := s.userRepo.FindByID(ctx, pID)
			if err == nil {
				participants = append(participants, dto.ParticipantDTO{
					ID:        user.ID.Hex(),
					Username:  user.Username,
					AvatarURL: user.AvatarURL,
				})
			}
		}

		var lastMsg *dto.MessageDTO
		if conv.LastMessage != nil {
			lastMsg = &dto.MessageDTO{
				ID:        conv.LastMessage.ID.Hex(),
				SenderID:  conv.LastMessage.SenderID.Hex(),
				Content:   conv.LastMessage.Content,
				Type:      string(conv.LastMessage.Type),
				MediaURL:  conv.LastMessage.MediaURL,
				FileName:  conv.LastMessage.FileName,
				CreatedAt: conv.LastMessage.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
				IsRead:    conv.LastMessage.IsRead,
			}
		}

		responses = append(responses, dto.ConversationResponse{
			ID:           conv.ID.Hex(),
			Participants: participants,
			LastMessage:  lastMsg,
			UpdatedAt:    conv.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return responses, nil
}

func (s *MessageService) GetMessages(ctx context.Context, conversationID primitive.ObjectID, limit int64) ([]dto.MessageDTO, error) {
	msgs, err := s.repo.GetConversationMessages(ctx, conversationID, limit)
	if err != nil {
		return nil, err
	}

	var responses []dto.MessageDTO
	for _, m := range msgs {
		responses = append(responses, dto.MessageDTO{
			ID:        m.ID.Hex(),
			SenderID:  m.SenderID.Hex(),
			Content:   m.Content,
			Type:      string(m.Type),
			MediaURL:  m.MediaURL,
			FileName:  m.FileName,
			CreatedAt: m.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			IsRead:    m.IsRead,
		})
	}

	return responses, nil
}

func (s *MessageService) DeleteMessage(ctx context.Context, messageID, userID primitive.ObjectID) error {
	msg, err := s.repo.GetMessageByID(ctx, messageID)
	if err != nil {
		return err
	}
	if msg.SenderID != userID {
		return errors.New("unauthorized: you can only delete your own messages")
	}
	return s.repo.DeleteMessage(ctx, messageID)
}

func (s *MessageService) DeleteConversation(ctx context.Context, conversationID, userID primitive.ObjectID) error {
	conv, err := s.repo.GetConversationByID(ctx, conversationID)
	if err != nil {
		return err
	}

	// Check if user is a participant
	isParticipant := false
	for _, pID := range conv.Participants {
		if pID == userID {
			isParticipant = true
			break
		}
	}
	if !isParticipant {
		return errors.New("unauthorized: you are not a participant in this conversation")
	}

	return s.repo.DeleteConversation(ctx, conversationID)
}
