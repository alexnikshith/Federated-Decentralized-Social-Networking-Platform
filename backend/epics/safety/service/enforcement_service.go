package service

import (
	"context"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	identityRepo "federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/safety/models"
	"federated-social/backend/epics/safety/repository"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EnforcementService struct {
	moderationRepo *repository.ModerationRepository
	postRepo       *contentRepo.PostRepository
	userRepo       *identityRepo.UserRepository
	aiService      *AIModeratorService
}

func NewEnforcementService(
	modRepo *repository.ModerationRepository,
	postRepo *contentRepo.PostRepository,
	userRepo *identityRepo.UserRepository,
	aiService *AIModeratorService,
) *EnforcementService {
	return &EnforcementService{
		moderationRepo: modRepo,
		postRepo:       postRepo,
		userRepo:       userRepo,
		aiService:      aiService,
	}
}

// ModeratePostAsync performs asynchronous moderation on a post
func (s *EnforcementService) ModeratePostAsync(postID primitive.ObjectID) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		post, err := s.postRepo.GetPostByID(ctx, postID)
		if err != nil {
			log.Printf("[Moderation] Failed to get post %s: %v", postID.Hex(), err)
			return
		}

		guidelines, err := s.moderationRepo.GetActiveGuidelines(ctx)
		if err != nil {
			log.Printf("[Moderation] Failed to get guidelines: %v", err)
			return
		}

		if s.aiService == nil {
			log.Printf("[Moderation] Skipping moderation for post %s: AI Service not initialized (check GEMINI_API_KEY)", postID.Hex())
			return
		}

		log.Printf("[Moderation] Evaluating post %s with %d guidelines", postID.Hex(), len(guidelines))
		result, err := s.aiService.ModerateContent(ctx, post.Content, guidelines)
		if err != nil {
			log.Printf("[Moderation] AI evaluation failed for post %s: %v", postID.Hex(), err)
			return
		}

		// Log the moderation decision
		logEntry := &models.ModerationLog{
			TargetID:    post.ID,
			TargetType:  "post",
			UserID:      post.AuthorID,
			Content:     post.Content,
			IsViolation: result.IsViolation,
			Reason:      result.Reason,
			ActionTaken: "none",
			CreatedAt:   time.Now(),
		}

		if result.IsViolation {
			log.Printf("[Moderation] VIOLATION detected in post %s: %s", postID.Hex(), result.Reason)

			// 1. Hard delete the post
			if err := s.postRepo.DeletePost(ctx, postID); err != nil {
				log.Printf("[Moderation] Failed to delete post %s: %v", postID.Hex(), err)
				// Continue anyway to log the violation and increment strikes
			}

			// 2. Increment user strikes
			s.incrementUserStrikes(ctx, post.AuthorID)

			logEntry.ActionTaken = "deletion + warning"
		} else {
			post.ModerationStatus = "approved"
			s.postRepo.UpdatePost(ctx, post)
		}

		s.moderationRepo.CreateLog(ctx, logEntry)
	}()
}

// ModerateCommentAsync performs asynchronous moderation on a comment
func (s *EnforcementService) ModerateCommentAsync(commentID primitive.ObjectID) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		comment, err := s.postRepo.GetCommentByID(ctx, commentID)
		if err != nil {
			log.Printf("[Moderation] Failed to get comment %s: %v", commentID.Hex(), err)
			return
		}

		guidelines, err := s.moderationRepo.GetActiveGuidelines(ctx)
		if err != nil {
			log.Printf("[Moderation] Failed to get guidelines: %v", err)
			return
		}

		if s.aiService == nil {
			log.Printf("[Moderation] Skipping moderation for comment %s: AI Service not initialized", commentID.Hex())
			return
		}

		result, err := s.aiService.ModerateContent(ctx, comment.Content, guidelines)
		if err != nil {
			log.Printf("[Moderation] AI evaluation failed for comment %s: %v", commentID.Hex(), err)
			return
		}

		// Log the moderation decision
		logEntry := &models.ModerationLog{
			TargetID:    comment.ID,
			TargetType:  "comment",
			UserID:      comment.UserID,
			Content:     comment.Content,
			IsViolation: result.IsViolation,
			Reason:      result.Reason,
			ActionTaken: "none",
			CreatedAt:   time.Now(),
		}

		if result.IsViolation {
			log.Printf("[Moderation] VIOLATION detected in comment %s: %s", commentID.Hex(), result.Reason)

			// 1. Hard delete the comment
			if err := s.postRepo.DeleteComment(ctx, commentID); err != nil {
				log.Printf("[Moderation] Failed to delete comment %s: %v", commentID.Hex(), err)
			}

			// 2. Increment user strikes
			s.incrementUserStrikes(ctx, comment.UserID)

			logEntry.ActionTaken = "deletion + warning"
		}

		s.moderationRepo.CreateLog(ctx, logEntry)
	}()
}

// ModerateUserAsync performs asynchronous moderation on user profile fields
func (s *EnforcementService) ModerateUserAsync(userID primitive.ObjectID, fieldType string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		user, err := s.userRepo.FindByID(ctx, userID)
		if err != nil {
			log.Printf("[Moderation] Failed to get user %s: %v", userID.Hex(), err)
			return
		}

		content := ""
		switch fieldType {
		case "display_name":
			content = user.DisplayName
		case "bio":
			content = user.Bio
		case "username":
			content = user.Username
		default:
			return
		}

		if content == "" {
			return
		}

		guidelines, err := s.moderationRepo.GetActiveGuidelines(ctx)
		if err != nil {
			log.Printf("[Moderation] Failed to get guidelines: %v", err)
			return
		}

		result, err := s.aiService.ModerateContent(ctx, content, guidelines)
		if err != nil {
			log.Printf("[Moderation] AI evaluation failed for user profile %s (%s): %v", userID.Hex(), fieldType, err)
			return
		}

		logEntry := &models.ModerationLog{
			TargetID:    user.ID,
			TargetType:  fieldType,
			UserID:      user.ID,
			Content:     content,
			IsViolation: result.IsViolation,
			Reason:      result.Reason,
			ActionTaken: "none",
			CreatedAt:   time.Now(),
		}

		if result.IsViolation {
			log.Printf("[Moderation] VIOLATION detected in user %s %s: %s", user.Username, fieldType, result.Reason)

			// 1. Reset the field
			update := bson.M{}
			if fieldType == "display_name" {
				update["display_name"] = "Community Member"
			} else if fieldType == "bio" {
				update["bio"] = ""
			} else if fieldType == "username" {
				update["username"] = "user_" + user.ID.Hex()[:8]
			}
			s.userRepo.UpdateUser(ctx, userID, update)

			// 2. Increment user strikes
			s.incrementUserStrikes(ctx, userID)

			logEntry.ActionTaken = "reset + warning"
		}

		s.moderationRepo.CreateLog(ctx, logEntry)
	}()
}

// RunRetroactiveScan iterates through all posts and profile fields to re-moderate them
func (s *EnforcementService) RunRetroactiveScan(ctx context.Context) error {
	log.Println("[Moderation] Starting retroactive scan...")

	// 1. Scan all posts
	posts, err := s.postRepo.FindAll(ctx)
	if err != nil {
		return err
	}

	for _, post := range posts {
		// Skip already deleted posts if they were deleted by moderation
		if post.Status == "deleted" && post.ModerationStatus == "flagged" {
			continue
		}
		s.ModeratePostAsync(post.ID)
	}

	// 2. Scan all users (profile fields)
	// For simplicity, we trigger moderation on bio and display_name for everyone
	cursor, err := s.userRepo.FindAll(ctx)
	if err != nil {
		return err
	}

	for _, user := range cursor {
		s.ModerateUserAsync(user.ID, "display_name")
		s.ModerateUserAsync(user.ID, "bio")
		s.ModerateUserAsync(user.ID, "username")
	}

	log.Printf("[Moderation] Retroactive scan triggered for %d posts and users.", len(posts))
	return nil
}

func (s *EnforcementService) incrementUserStrikes(ctx context.Context, userID primitive.ObjectID) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return
	}

	strikes := user.Strikes + 1
	accountStatus := user.AccountStatus
	isDeactivated := user.IsDeactivated

	// For now, we only issue warnings. Automatic suspension is disabled.
	accountStatus = "warned"

	update := bson.M{
		"strikes":        strikes,
		"account_status": accountStatus,
		"is_deactivated": isDeactivated,
	}

	if err := s.userRepo.UpdateUser(ctx, userID, update); err != nil {
		log.Printf("[Moderation] Failed to update user strikes for %s: %v", userID.Hex(), err)
		return
	}

	log.Printf("[Moderation] User %s now has %d strikes. Status: %s", user.Username, strikes, accountStatus)
}
