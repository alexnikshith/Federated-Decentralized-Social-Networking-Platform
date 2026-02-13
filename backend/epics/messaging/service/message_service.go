package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"federated-social/backend/config"
	sharingService "federated-social/backend/epics/content-sharing/service"
	federationModels "federated-social/backend/epics/federation/models"
	federationRepo "federated-social/backend/epics/federation/repository"
	identityRepo "federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/messaging/dto"
	"federated-social/backend/epics/messaging/models"
	msgRepo "federated-social/backend/epics/messaging/repository"
	"fmt"
	"log"
	"net/http"
	"strings"

	"federated-social/backend/pkg/websocket"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageService struct {
	repo           *msgRepo.MessageRepository
	userRepo       *identityRepo.UserRepository
	remoteUserRepo *federationRepo.RemoteUserRepository
	notifService   *sharingService.NotificationService
}

func NewMessageService() *MessageService {
	return &MessageService{
		repo:           msgRepo.NewMessageRepository(),
		userRepo:       identityRepo.NewUserRepository(),
		remoteUserRepo: federationRepo.NewRemoteUserRepository(),
		notifService:   sharingService.NewNotificationService(),
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
		// If user not found, we assume it's a remote/federated user
		if err.Error() == "user not found" {
			// We allow messaging remote users even if they aren't in our local DB
			// They will be displayed as "Federated User" in the UI until we cache them
		} else {
			return nil, err
		}
	} else {
		if receiver.IsDeactivated || !receiver.IsActive {
			return nil, errors.New("cannot send message to deactivated user")
		}
	}

	// Check if conversation exists
	participants := []primitive.ObjectID{senderID, receiverID}
	conv, err := s.repo.GetConversation(ctx, participants)
	if err != nil {
		return nil, err
	}

	// Create conversation if it doesn't exist
	if conv == nil {
		instances := make(map[string]string)
		if req.ReceiverCommunityURL != "" {
			instances[req.ReceiverID] = req.ReceiverCommunityURL
		}
		conv, err = s.repo.CreateConversation(ctx, participants, instances, make(map[string]string), make(map[string]string))
		if err != nil {
			return nil, err
		}
	} else if req.ReceiverCommunityURL == "" && conv.ParticipantInstances != nil {
		// Try to get from existing conversation
		if url, ok := conv.ParticipantInstances[req.ReceiverID]; ok {
			req.ReceiverCommunityURL = url
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

		// NEW: Federated Message Delivery
		if req.ReceiverCommunityURL != "" {
			go func() {
				// We need our own community URL and username to tell the recipient who we are
				senderCommunityUrl := config.AppConfig.InstanceDomain
				if !strings.HasPrefix(senderCommunityUrl, "http://") && !strings.HasPrefix(senderCommunityUrl, "https://") {
					senderCommunityUrl = "http://" + senderCommunityUrl
				}

				senderUsername := "Unknown User"
				senderDisplayName := ""
				sender, err := s.userRepo.FindByID(context.Background(), senderID)
				if err == nil {
					senderUsername = sender.Username
					senderDisplayName = sender.DisplayName
				}

				deliveryReq := dto.ReceiveRemoteMessageRequest{
					SenderID:           senderID.Hex(),
					SenderUsername:     senderUsername,
					SenderDisplayName:  senderDisplayName,
					SenderCommunityURL: senderCommunityUrl,
					ReceiverID:         req.ReceiverID,
					Content:            req.Content,
					Type:               req.Type,
					MediaURL:           req.MediaURL,
					FileName:           req.FileName,
				}

				resolvedURL := s.resolveFederationURL(req.ReceiverCommunityURL)
				body, _ := json.Marshal(deliveryReq)
				resp, err := http.Post(resolvedURL+"/api/messages/remote", "application/json", bytes.NewBuffer(body))
				if err != nil {
					log.Printf("ERROR: Failed to deliver remote message to %v: %v", resolvedURL, err)
				} else {
					defer resp.Body.Close()
					log.Printf("DEBUG: Remote message delivered to %v, status: %d", resolvedURL, resp.StatusCode)
				}
			}()
		}
	}

	return msg, nil
}

// resolveFederationURL maps public-facing URLs (like localhost:8081) to internal Docker URLs
// so that containers can communicate with each other during development.
func (s *MessageService) resolveFederationURL(url string) string {
	// Dev hack: map localhost ports to docker service names
	if strings.Contains(url, "localhost:8080") {
		return strings.Replace(url, "localhost:8080", "backend:8080", 1)
	}
	if strings.Contains(url, "localhost:8081") {
		return strings.Replace(url, "localhost:8081", "backend2:8080", 1)
	}
	return url
}

func (s *MessageService) extractCommunityName(url string) string {
	if url == "" {
		return ""
	}
	// Dev mapping
	if strings.Contains(url, "localhost:8080") || strings.Contains(url, "community1") {
		return "Community 1"
	}
	if strings.Contains(url, "localhost:8081") || strings.Contains(url, "community2") {
		return "Community 2"
	}
	if strings.Contains(url, "default") {
		return config.AppConfig.InstanceName
	}
	// Generic fallback: extract host
	parts := strings.Split(url, "://")
	host := url
	if len(parts) > 1 {
		hostParts := strings.Split(parts[1], "/")
		host = hostParts[0]
	}
	return host
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
			// Skip the current user
			if pID == userID {
				continue
			}

			user, err := s.userRepo.FindByID(ctx, pID)
			if err == nil {
				// Check if the other participant is deactivated or deleted
				communityName := config.AppConfig.InstanceName
				if user.InstanceID != "" && user.InstanceID != config.AppConfig.InstanceDomain {
					communityName = s.extractCommunityName(user.InstanceID)
				}

				participants = append(participants, dto.ParticipantDTO{
					ID:            user.ID.Hex(),
					Username:      user.Username,
					DisplayName:   user.DisplayName,
					AvatarURL:     user.AvatarURL,
					IsDeleted:     false,
					IsDeactivated: user.IsDeactivated || !user.IsActive,
					CommunityURL:  user.InstanceID,
					CommunityName: communityName,
				})
			} else {
				// User is not found locally, try remote user repository
				remoteUser, remoteErr := s.remoteUserRepo.GetRemoteUserByID(ctx, pID)
				if remoteErr == nil {
					communityName := s.extractCommunityName(remoteUser.Instance)
					participants = append(participants, dto.ParticipantDTO{
						ID:            pID.Hex(),
						Username:      remoteUser.Username,
						DisplayName:   remoteUser.DisplayName,
						AvatarURL:     remoteUser.AvatarURL,
						IsDeleted:     false,
						IsDeactivated: false,
						CommunityURL:  remoteUser.Instance,
						CommunityName: communityName,
					})
				} else {
					// Truly unknown user
					commURL := ""
					username := "Unknown User"
					displayName := ""
					if conv.ParticipantInstances != nil {
						commURL = conv.ParticipantInstances[pID.Hex()]
					}
					if conv.ParticipantUsernames != nil {
						if u, ok := conv.ParticipantUsernames[pID.Hex()]; ok && u != "" {
							username = u
						}
					}
					if conv.ParticipantDisplayNames != nil {
						if d, ok := conv.ParticipantDisplayNames[pID.Hex()]; ok && d != "" {
							displayName = d
						}
					}
					if displayName == "" && username != "Unknown User" {
						displayName = username
					}

					participants = append(participants, dto.ParticipantDTO{
						ID:            pID.Hex(),
						Username:      username,
						DisplayName:   displayName,
						AvatarURL:     "",
						IsDeleted:     false,
						IsDeactivated: false,
						CommunityURL:  commURL,
						CommunityName: s.extractCommunityName(commURL),
					})
				}
			}
		}

		// Skip this conversation only if we explicitly want to (e.g. both participants are same)
		if len(participants) == 0 {
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

// ReceiveRemoteMessage handles a message pushed from another community
func (s *MessageService) ReceiveRemoteMessage(ctx context.Context, req dto.ReceiveRemoteMessageRequest) (*models.Message, error) {
	senderID, err := primitive.ObjectIDFromHex(req.SenderID)
	if err != nil {
		return nil, errors.New("invalid sender ID")
	}
	receiverID, err := primitive.ObjectIDFromHex(req.ReceiverID)
	if err != nil {
		return nil, errors.New("invalid receiver ID")
	}

	// 1. Ensure receiver exists
	_, err = s.userRepo.FindByID(ctx, receiverID)
	if err != nil {
		return nil, errors.New("receiver not found")
	}

	// 2. Prepare participant instances map
	// We only track the REMOTE user's instance. Local user's instance is blank (local).
	instances := map[string]string{
		req.SenderID: req.SenderCommunityURL,
	}

	// 3. Cache Remote User metadata for future lookups
	if s.remoteUserRepo != nil {
		remoteUser := &federationModels.RemoteUser{
			ID:          senderID,
			ActorID:     fmt.Sprintf("%s/users/%s", req.SenderCommunityURL, req.SenderUsername),
			Username:    req.SenderUsername,
			DisplayName: req.SenderDisplayName,
			Instance:    req.SenderCommunityURL,
		}
		s.remoteUserRepo.UpsertRemoteUser(ctx, remoteUser)
	}

	// 4. Get or Create Conversation
	conv, err := s.repo.GetConversation(ctx, []primitive.ObjectID{senderID, receiverID})
	if err != nil {
		return nil, err
	}
	if conv == nil {
		// Prepare metadata for remote/federated users
		usernames := map[string]string{
			req.SenderID: req.SenderUsername,
		}
		displayNames := map[string]string{
			req.SenderID: req.SenderDisplayName,
		}
		// Create new conversation with instances metadata
		conv, err = s.repo.CreateConversation(ctx, []primitive.ObjectID{senderID, receiverID}, instances, usernames, displayNames)
		if err != nil {
			return nil, err
		}
	} else {
		// Ensure instances and usernames are up to date
		if conv.ParticipantInstances == nil {
			conv.ParticipantInstances = make(map[string]string)
		}
		if conv.ParticipantUsernames == nil {
			conv.ParticipantUsernames = make(map[string]string)
		}
		if conv.ParticipantDisplayNames == nil {
			conv.ParticipantDisplayNames = make(map[string]string)
		}
		conv.ParticipantInstances[req.SenderID] = req.SenderCommunityURL
		if req.SenderUsername != "" {
			conv.ParticipantUsernames[req.SenderID] = req.SenderUsername
		}
		if req.SenderDisplayName != "" {
			conv.ParticipantDisplayNames[req.SenderID] = req.SenderDisplayName
		}
	}

	// 4. Create and save message
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

	// 5. Broadcast to recipient via WebSocket
	websocket.GlobalHub.BroadcastToUser(receiverID.Hex(), "new_message", map[string]interface{}{
		"message":      msg,
		"conversation": conv,
	})

	// 6. Create local notification for the recipient
	go func() {
		senderName := req.SenderDisplayName
		if senderName == "" {
			senderName = req.SenderUsername
		}
		if senderName == "" {
			senderName = "Unknown User"
		}
		s.notifService.CreateNotification(context.Background(), receiverID, senderID, "message", conv.ID, req.Content, senderName, "")
	}()

	return msg, nil
}
