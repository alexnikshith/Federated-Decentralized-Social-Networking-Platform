package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/messaging/dto"
	"federated-social/backend/epics/messaging/models"
	msgRepo "federated-social/backend/epics/messaging/repository"

	"federated-social/backend/pkg/websocket"

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

// SendMessage handles sending a new message
// It validates the receiver, checks/creates the conversation, saves the message,
// and broadcasts it via WebSocket to the recipient using GlobalHub.
func (s *MessageService) SendMessage(ctx context.Context, senderID primitive.ObjectID, req dto.SendMessageRequest) (*models.Message, error) {
	receiverID, err := primitive.ObjectIDFromHex(req.ReceiverID)
	if err != nil {
		return nil, errors.New("invalid receiver ID")
	}

	// Check if receiver is deactivated or deleted
	receiver, err := s.userRepo.FindByID(ctx, receiverID)
	if err != nil {
		return nil, errors.New("receiver not found")
	}
	if receiver.IsDeactivated || !receiver.IsActive {
		return nil, errors.New("cannot send message to deactivated user")
	}

	// Check if conversation exists
	participants := []primitive.ObjectID{senderID, receiverID}
	conv, err := s.repo.GetConversation(ctx, participants)
	if err != nil {
		return nil, err
	}

	// Create conversation if it doesn't exist
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

	// Broadcast via WebSocket to enable real-time updates
	if websocket.GlobalHub != nil {
		msgDTO := dto.MessageDTO{
			ID:             msg.ID.Hex(),
			ConversationID: msg.ConversationID.Hex(),
			SenderID:       msg.SenderID.Hex(),
			Content:        msg.Content,
			Type:           string(msg.Type),
			MediaURL:       msg.MediaURL,
			FileName:       msg.FileName,
			CreatedAt:      msg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			IsRead:         msg.IsRead,
		}

		// Send to receiver
		websocket.GlobalHub.BroadcastToUser(req.ReceiverID, "new_message", msgDTO)

		// Optional: also send to sender's other sessions
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
		hasDeletedOrDeactivatedOther := false

		for _, pID := range conv.Participants {
			// Skip the current user
			if pID == userID {
				continue
			}

			user, err := s.userRepo.FindByID(ctx, pID)
			if err == nil {
				// Check if the other participant is deactivated or deleted
				participants = append(participants, dto.ParticipantDTO{
					ID:            user.ID.Hex(),
					Username:      user.Username,
					AvatarURL:     user.AvatarURL,
					IsDeleted:     false,
					IsDeactivated: user.IsDeactivated || !user.IsActive,
				})
			} else {
				// User is deleted
				hasDeletedOrDeactivatedOther = true
				break
			}
		}

		// Skip this conversation if the other participant is deleted or deactivated
		if hasDeletedOrDeactivatedOther {
			continue
		}

		var lastMsg *dto.MessageDTO

		// Self-healing: If LastMessage is nil, try to fetch the actual latest message
		if conv.LastMessage == nil {
			msgs, _ := s.repo.GetConversationMessages(ctx, conv.ID, 1)
			if len(msgs) > 0 {
				conv.LastMessage = &msgs[0]
			}
		}

		if conv.LastMessage != nil {
			lastMsg = &dto.MessageDTO{
				ID:             conv.LastMessage.ID.Hex(),
				ConversationID: conv.ID.Hex(), // LastMessage might not have it populated or we use conv.ID
				SenderID:       conv.LastMessage.SenderID.Hex(),
				Content:        conv.LastMessage.Content,
				Type:           string(conv.LastMessage.Type),
				MediaURL:       conv.LastMessage.MediaURL,
				FileName:       conv.LastMessage.FileName,
				CreatedAt:      conv.LastMessage.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
				IsRead:         conv.LastMessage.IsRead,
			}
		}

		unreadCountVal, _ := s.repo.GetUnreadCountForConversation(ctx, conv.ID, userID)
		unreadCount := int(unreadCountVal)

		responses = append(responses, dto.ConversationResponse{
			ID:           conv.ID.Hex(),
			Participants: participants,
			LastMessage:  lastMsg,
			UpdatedAt:    conv.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UnreadCount:  unreadCount,
		})
	}

	return responses, nil
}

func (s *MessageService) GetTotalUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return s.repo.GetTotalUnreadCount(ctx, userID)
}

func (s *MessageService) GetMessages(ctx context.Context, conversationID primitive.ObjectID, limit int64) ([]dto.MessageDTO, error) {
	msgs, err := s.repo.GetConversationMessages(ctx, conversationID, limit)
	if err != nil {
		return nil, err
	}

	var responses []dto.MessageDTO
	for _, m := range msgs {
		responses = append(responses, dto.MessageDTO{
			ID:             m.ID.Hex(),
			ConversationID: m.ConversationID.Hex(),
			SenderID:       m.SenderID.Hex(),
			Content:        m.Content,
			Type:           string(m.Type),
			MediaURL:       m.MediaURL,
			FileName:       m.FileName,
			CreatedAt:      m.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			IsRead:         m.IsRead,
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

// MarkConversationAsRead marks all messages in a conversation as read
func (s *MessageService) MarkConversationAsRead(ctx context.Context, conversationID, userID primitive.ObjectID) error {
	return s.repo.MarkConversationAsRead(ctx, conversationID, userID)
}
