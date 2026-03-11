package service

import (
	"context"
	contentModels "federated-social/backend/epics/content-sharing/models"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	identityRepo "federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/safety/models"
	"federated-social/backend/epics/safety/repository"
	"fmt"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type moderationTask struct {
	targetID   primitive.ObjectID
	targetType string // "post", "comment", "username", "display_name", "bio"
	isScan     bool
}

type EnforcementService struct {
	moderationRepo   *repository.ModerationRepository
	postRepo         *contentRepo.PostRepository
	userRepo         *identityRepo.UserRepository
	aiService        *AIModeratorService
	isScanning       bool
	highPriorityChan chan moderationTask // Queue for user actions (posts, comments)
	lowPriorityChan  chan moderationTask // Queue for retroactive scans
}

func NewEnforcementService(
	modRepo *repository.ModerationRepository,
	postRepo *contentRepo.PostRepository,
	userRepo *identityRepo.UserRepository,
	aiService *AIModeratorService,
) *EnforcementService {
	s := &EnforcementService{
		moderationRepo:   modRepo,
		postRepo:         postRepo,
		userRepo:         userRepo,
		aiService:        aiService,
		highPriorityChan: make(chan moderationTask, 1000),
		lowPriorityChan:  make(chan moderationTask, 5000),
	}

	// Start the background worker
	go s.startWorker()

	return s
}

// GetAIService exposes the underlying AI moderator so callers can do
// synchronous pre-save moderation checks (e.g. profile field updates).
func (s *EnforcementService) GetAIService() *AIModeratorService {
	return s.aiService
}

// GetActiveGuidelines fetches the current community guidelines from the DB.
// Used by callers that need to run a synchronous moderation check.
func (s *EnforcementService) GetActiveGuidelines(ctx context.Context) ([]models.CommunityGuideline, error) {
	return s.moderationRepo.GetActiveGuidelines(ctx)
}

func (s *EnforcementService) startWorker() {
	log.Println("[Moderation] Background worker started with priority queues")
	for {
		var task moderationTask

		// Try to fetch from high priority queue first
		select {
		case task = <-s.highPriorityChan:
			// High priority task received
		default:
			// If high priority is empty, block and wait for either queue
			select {
			case task = <-s.highPriorityChan:
				// High priority task received while waiting
			case task = <-s.lowPriorityChan:
				// Low priority task received
			}
		}

		// Process task based on type
		switch task.targetType {
		case "post":
			s.processPostModeration(task.targetID)
		case "comment":
			s.processCommentModeration(task.targetID)
		default:
			s.processUserModeration(task.targetID, task.targetType)
		}

		// ALWAYS wait between tasks to preserve Google Quota
		time.Sleep(10 * time.Second)
	}
}

// ModeratePostAsync adds a post to the high priority moderation queue
func (s *EnforcementService) ModeratePostAsync(postID primitive.ObjectID) {
	s.highPriorityChan <- moderationTask{targetID: postID, targetType: "post"}
}

// ModeratePostLowPriority adds a post to the low priority moderation queue (used for scans)
func (s *EnforcementService) ModeratePostLowPriority(postID primitive.ObjectID) {
	s.lowPriorityChan <- moderationTask{targetID: postID, targetType: "post"}
}

func (s *EnforcementService) processPostModeration(postID primitive.ObjectID) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	post, err := s.postRepo.GetPostByIDAdmin(ctx, postID)
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
		log.Printf("[Moderation] Skipping moderation for post %s: AI Service not initialized (check GROQ_API_KEY)", postID.Hex())
		return
	}

	log.Printf("[Moderation] Evaluating post %s with %d guidelines. Content: %.50s", postID.Hex(), len(guidelines), post.Content)
	// Attempt moderation with a single retry for 429 (Quota Exceeded) errors
	var result *ModerationResult

	for attempt := 1; attempt <= 2; attempt++ {
		result, err = s.aiService.ModerateContent(ctx, post.Content, guidelines)
		if err == nil {
			break
		}

		// If it's a quota error, wait and retry once
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "quota") {
			if attempt == 1 {
				log.Printf("[Moderation] Quota hit for post %s, retrying in 15s...", postID.Hex())
				time.Sleep(15 * time.Second)
				continue
			}
		}
		break
	}

	logEntry := &models.ModerationLog{
		TargetID:   post.ID,
		TargetType: "post",
		Content:    post.Content,
		UserID:     post.AuthorID,
		CreatedAt:  time.Now(),
	}

	if err != nil {
		log.Printf("[Moderation] AI evaluation failed for post %s after retries: %v", postID.Hex(), err)
		logEntry.IsViolation = false
		logEntry.Reason = fmt.Sprintf("AI Evaluation Error (Quota Exhausted): %v", err)
		logEntry.ActionTaken = "none"
		s.moderationRepo.CreateLog(ctx, logEntry)
		return
	}

	logEntry.IsViolation = result.IsViolation
	logEntry.Reason = result.Reason
	logEntry.Score = result.Score
	logEntry.BreachedRules = result.BreachedRules
	logEntry.BadWordsFound = result.BadWordsFound

	if result.IsViolation {
		log.Printf("[Moderation] VIOLATION detected in post %s: %s (Bad words: %v)", postID.Hex(), result.Reason, result.BadWordsFound)

		// 1. Create a moderation report for admin
		reason := "AI Moderation Auto-Flag: " + result.Reason
		if len(result.BadWordsFound) > 0 {
			reason += fmt.Sprintf(" (Terms: %v)", result.BadWordsFound)
		}

		report := &contentModels.ReportedPost{
			PostID:     post.ID,
			ReporterID: primitive.NilObjectID, // AI reporter
			Reason:     reason,
			Status:     "pending",
			CreatedAt:  time.Now(),
		}

		if err := s.postRepo.CreateReport(ctx, report); err != nil {
			log.Printf("[Moderation] Failed to create report for post %s: %v", postID.Hex(), err)
		}

		// 2. Hide the post from public feed (flag it)
		post.ModerationStatus = "flagged"
		post.Status = "under_review"
		if err := s.postRepo.UpdatePost(ctx, post); err != nil {
			log.Printf("[Moderation] Failed to update post %s status to flagged: %v", postID.Hex(), err)
		}

		// 3. Increment user strikes
		s.incrementUserStrikes(ctx, post.AuthorID)

		logEntry.ActionTaken = "reported + flagged + warning"
	} else {
		post.ModerationStatus = "approved"
		s.postRepo.UpdatePost(ctx, post)
		logEntry.ActionTaken = "none"
	}

	s.moderationRepo.CreateLog(ctx, logEntry)
}

// ModerateCommentAsync adds a comment to the high priority moderation queue
func (s *EnforcementService) ModerateCommentAsync(commentID primitive.ObjectID) {
	s.highPriorityChan <- moderationTask{targetID: commentID, targetType: "comment"}
}

func (s *EnforcementService) processCommentModeration(commentID primitive.ObjectID) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
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

	log.Printf("[Moderation] Evaluating comment %s with %d guidelines. Content: %.50s", commentID.Hex(), len(guidelines), comment.Content)

	var result *ModerationResult
	for attempt := 1; attempt <= 2; attempt++ {
		result, err = s.aiService.ModerateContent(ctx, comment.Content, guidelines)
		if err == nil {
			break
		}
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "quota") {
			if attempt == 1 {
				log.Printf("[Moderation] Quota hit for comment %s, retrying in 15s...", commentID.Hex())
				time.Sleep(15 * time.Second)
				continue
			}
		}
		break
	}

	logEntry := &models.ModerationLog{
		TargetID:   comment.ID,
		TargetType: "comment",
		Content:    comment.Content,
		UserID:     comment.UserID,
		CreatedAt:  time.Now(),
	}

	if err != nil {
		log.Printf("[Moderation] AI evaluation failed for comment %s: %v", commentID.Hex(), err)
		logEntry.IsViolation = false
		logEntry.Reason = fmt.Sprintf("AI Evaluation Error: %v", err)
		logEntry.ActionTaken = "none"
		s.moderationRepo.CreateLog(ctx, logEntry)
		return
	}

	logEntry.IsViolation = result.IsViolation
	logEntry.Reason = result.Reason
	logEntry.Score = result.Score
	logEntry.BreachedRules = result.BreachedRules
	logEntry.BadWordsFound = result.BadWordsFound
	logEntry.ActionTaken = "none"

	if result.IsViolation {
		log.Printf("[Moderation] VIOLATION detected in comment %s: %s (Bad words: %v)", commentID.Hex(), result.Reason, result.BadWordsFound)

		// 1. Hard delete the comment
		if err := s.postRepo.DeleteComment(ctx, commentID); err != nil {
			log.Printf("[Moderation] Failed to delete comment %s: %v", commentID.Hex(), err)
		}

		// 2. Increment user strikes
		s.incrementUserStrikes(ctx, comment.UserID)

		logEntry.ActionTaken = "deletion + warning"
	}

	s.moderationRepo.CreateLog(ctx, logEntry)
}

// ModerateUserAsync adds a profile field to the high priority moderation queue
func (s *EnforcementService) ModerateUserAsync(userID primitive.ObjectID, fieldType string) {
	s.highPriorityChan <- moderationTask{targetID: userID, targetType: fieldType}
}

func (s *EnforcementService) processUserModeration(userID primitive.ObjectID, fieldType string) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
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

	log.Printf("[Moderation] Evaluating user profile %s (%s) with %d guidelines. Content: %.50s", userID.Hex(), fieldType, len(guidelines), content)

	var result *ModerationResult
	for attempt := 1; attempt <= 2; attempt++ {
		result, err = s.aiService.ModerateContent(ctx, content, guidelines)
		if err == nil {
			break
		}
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "quota") {
			if attempt == 1 {
				log.Printf("[Moderation] Quota hit for user profile %s (%s), retrying in 15s...", userID.Hex(), fieldType)
				time.Sleep(15 * time.Second)
				continue
			}
		}
		break
	}

	logEntry := &models.ModerationLog{
		TargetID:   user.ID,
		TargetType: fieldType,
		Content:    content,
		UserID:     user.ID,
		CreatedAt:  time.Now(),
	}

	if err != nil {
		log.Printf("[Moderation] AI evaluation failed for user profile %s (%s): %v", userID.Hex(), fieldType, err)
		logEntry.IsViolation = false
		logEntry.Reason = fmt.Sprintf("AI Evaluation Error: %v", err)
		logEntry.ActionTaken = "none"
		s.moderationRepo.CreateLog(ctx, logEntry)
		return
	}

	logEntry.IsViolation = result.IsViolation
	logEntry.Reason = result.Reason
	logEntry.Score = result.Score
	logEntry.BreachedRules = result.BreachedRules
	logEntry.BadWordsFound = result.BadWordsFound
	logEntry.ActionTaken = "none"

	if result.IsViolation {
		log.Printf("[Moderation] VIOLATION detected in user %s %s: %s (Bad words: %v)", user.Username, fieldType, result.Reason, result.BadWordsFound)

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
}

// RunRetroactiveScan iterates through all posts and profile fields to re-moderate them
func (s *EnforcementService) RunRetroactiveScan(ctx context.Context) error {
	if s.isScanning {
		return fmt.Errorf("a retroactive scan is already in progress")
	}
	s.isScanning = true
	defer func() { s.isScanning = false }()

	// 1. Scan recent posts (limit to last 10 to reduce backlog)
	// Passing empty slice for excludeIDs and 10 for limit
	posts, err := s.postRepo.GetAllPosts(ctx, []primitive.ObjectID{}, 10)
	if err != nil {
		return err
	}

	for _, post := range posts {
		// Skip already deleted posts if they were deleted by moderation
		if post.Status == "deleted" && post.ModerationStatus == "flagged" {
			continue
		}
		s.ModeratePostLowPriority(post.ID)
		// No manual sleep needed here, the worker handles it!
	}

	/*
		// 2. Scan all users (profile fields)
		users, err := s.userRepo.FindAll(ctx)
		if err != nil {
			log.Printf("[Moderation] Failed to fetch users for scan: %v", err)
		} else {
			for _, user := range users {
				s.ModerateUserAsync(user.ID, "display_name")
				time.Sleep(1 * time.Second)
				s.ModerateUserAsync(user.ID, "bio")
				time.Sleep(1 * time.Second)
				s.ModerateUserAsync(user.ID, "username")
				time.Sleep(1 * time.Second)
			}
		}
	*/
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
