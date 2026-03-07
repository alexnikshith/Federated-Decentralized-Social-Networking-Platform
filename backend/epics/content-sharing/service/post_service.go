package service

import (
	"context"
	"errors"
	"federated-social/backend/config"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	federationService "federated-social/backend/epics/federation/service"
	identityModels "federated-social/backend/epics/identity/models"
	reportRepo "federated-social/backend/epics/reports/repository"
	safetyRepo "federated-social/backend/epics/safety/repository"
	safetyService "federated-social/backend/epics/safety/service"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"
	"time"

	fedModels "federated-social/backend/epics/federation/models"
	recService "federated-social/backend/epics/recommendations/service"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PostRepositoryInterface interface {
	CreatePost(ctx context.Context, post *models.Post) error
	UpdatePost(ctx context.Context, post *models.Post) error
	GetPostByID(ctx context.Context, id primitive.ObjectID) (*models.Post, error)
	GetPostByIDAdmin(ctx context.Context, id primitive.ObjectID) (*models.Post, error)
	GetPostsByAuthors(ctx context.Context, ids []primitive.ObjectID, limit int64) ([]models.Post, error)
	GetAllPosts(ctx context.Context, excludeIDs []primitive.ObjectID, limit int64) ([]models.Post, error)
	GetHiddenPostIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error)
	GetPostsByAuthor(ctx context.Context, authorID primitive.ObjectID, limit int64) ([]models.Post, error)
	CreateLike(ctx context.Context, like *models.Like) error
	DeleteLike(ctx context.Context, postID, userID primitive.ObjectID) error
	CheckIfLiked(ctx context.Context, postID, userID primitive.ObjectID) (bool, error)
	CreateComment(ctx context.Context, comment *models.Comment) error
	GetCommentByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error)
	GetCommentsByPostID(ctx context.Context, postID primitive.ObjectID) ([]models.Comment, error)
	DeleteComment(ctx context.Context, commentID primitive.ObjectID) error
	DeletePost(ctx context.Context, postID primitive.ObjectID) error
	CheckIfSaved(ctx context.Context, postID, userID primitive.ObjectID) (bool, error)
	UpdatePostMentions(ctx context.Context, postID primitive.ObjectID, usernames []string) error
	GetLikedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error)
	GetCommentedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error)
	GetLikesByPostID(ctx context.Context, postID primitive.ObjectID) ([]models.Like, error)
	SavePost(ctx context.Context, savedPost *models.SavedPost) error
	UnsavePost(ctx context.Context, userID, postID primitive.ObjectID) error
	GetSavedPostIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error)
	CreateReport(ctx context.Context, report *models.ReportedPost) error
	UpsertInteraction(ctx context.Context, interaction *models.PostInteraction) error
	GetAllReports(ctx context.Context) ([]models.ReportedPost, error)
}

type PostService struct {
	postRepo          PostRepositoryInterface
	followRepo        *repository.FollowRepository
	searchRepo        *repository.SearchRepository
	notificationRepo  *repository.NotificationRepository
	reportRepo        *reportRepo.ReportRepository
	blockService      *safetyService.BlockService
	federationService *federationService.FederationService
	recService        *recService.RecommenderService
}

func NewPostService() *PostService {
	var fedService *federationService.FederationService
	if config.AppConfig.FederationEnabled {
		fedService = federationService.NewFederationService()
	}

	postRepo := repository.NewPostRepository()

	return &PostService{
		postRepo:          postRepo,
		followRepo:        repository.NewFollowRepository(),
		searchRepo:        repository.NewSearchRepository(),
		notificationRepo:  repository.NewNotificationRepository(),
		reportRepo:        reportRepo.NewReportRepository(),
		blockService:      safetyService.NewBlockService(safetyRepo.NewBlockRepository()),
		federationService: fedService,
		recService:        recService.NewRecommenderService(postRepo),
	}
}

func NewPostServiceWithDeps(
	postRepo PostRepositoryInterface,
	followRepo *repository.FollowRepository,
	searchRepo *repository.SearchRepository,
	notificationRepo *repository.NotificationRepository,
	reportRepo *reportRepo.ReportRepository,
	blockService *safetyService.BlockService,
	fedService *federationService.FederationService,
) *PostService {
	return &PostService{
		postRepo:          postRepo,
		followRepo:        followRepo,
		searchRepo:        searchRepo,
		notificationRepo:  notificationRepo,
		reportRepo:        reportRepo,
		blockService:      blockService,
		federationService: fedService,
		recService:        recService.NewRecommenderService(postRepo),
	}
}

// CreatePost creates a new post
func (s *PostService) CreatePost(ctx context.Context, userID primitive.ObjectID, req dto.CreatePostRequest) (*models.Post, error) {
	post := &models.Post{
		AuthorID:  userID,
		Content:   req.Content,
		MediaURL:  req.MediaURL,
		MediaType: req.MediaType,
	}

	if err := s.postRepo.CreatePost(ctx, post); err != nil {
		return nil, err
	}

	// Handle Mentions: @username
	validMentions := s.parseAndNotifyMentions(ctx, req.Content, userID, post.ID)
	if len(validMentions) > 0 {
		post.MentionedUsernames = validMentions
		s.postRepo.UpdatePost(ctx, post)
	}

	// Trigger federation if enabled
	if s.federationService != nil {
		// Get user info for federation
		users, err := s.searchRepo.GetUsersByIDs(ctx, []primitive.ObjectID{userID})
		if err == nil && users[userID] != nil {
			user := users[userID]

			// Broadcast ActivityPub Create activity to all remote followers
			go func() {
				bgCtx := context.Background()

				// Ensure the user has an RSA keypair for signing
				fullUser, err := s.federationService.GetUserWithKeyPair(bgCtx, userID)
				if err != nil || fullUser == nil {
					log.Printf("[AP Post] Could not load user keypair for %s: %v", user.Username, err)
					return
				}

				base := config.AppConfig.BaseURL()
				actorURL := fmt.Sprintf("%s/users/%s", base, fullUser.Username)
				postID := post.ID.Hex()
				noteID := fmt.Sprintf("%s/users/%s/posts/%s", base, fullUser.Username, postID)
				createID := fmt.Sprintf("%s/activities/create-%s", base, postID)
				keyID := actorURL + "#main-key"

				note := map[string]interface{}{
					"type":         "Note",
					"id":           noteID,
					"attributedTo": actorURL,
					"content":      post.Content,
					"published":    post.CreatedAt.UTC().Format(time.RFC3339),
					"to":           []string{"https://www.w3.org/ns/activitystreams#Public"},
				}
				createActivity := map[string]interface{}{
					"@context":  "https://www.w3.org/ns/activitystreams",
					"type":      "Create",
					"id":        createID,
					"actor":     actorURL,
					"published": post.CreatedAt.UTC().Format(time.RFC3339),
					"to":        []string{"https://www.w3.org/ns/activitystreams#Public"},
					"object":    note,
				}

				log.Printf("[AP Post] Delivering Create for post %s by %s", postID, fullUser.Username)
				s.federationService.DeliverActivityToFollowers(bgCtx, fullUser.Username, fullUser.PrivateKeyPem, keyID, userID, createActivity)
			}()
		}
	}

	return post, nil
}

// GetFeed retrieves the feed based on type: "home" (followed + remote followed) or "public" (local all)
func (s *PostService) GetFeed(ctx context.Context, userID primitive.ObjectID, limit int64, feedType string) (*dto.FeedResponse, error) {
	log.Printf("DEBUG GetFeed: Starting feed retrieval for user %v, limit=%d, type=%s", userID, limit, feedType)

	// Get blocking info (bidirectional)
	blockedIDs, err := s.blockService.GetHiddenUserIDs(ctx, userID)
	if err != nil {
		log.Printf("ERROR GetFeed: Failed to get blocked IDs: %v", err)
		return nil, err
	}

	// Also hide users that you have reported
	reportedUserIDs, _ := s.reportRepo.GetReportedUserIDs(ctx, userID)
	if len(reportedUserIDs) > 0 {
		blockedIDs = append(blockedIDs, reportedUserIDs...)
	}

	blockedMap := make(map[primitive.ObjectID]bool)
	for _, id := range blockedIDs {
		blockedMap[id] = true
	}

	finalPosts := make([]dto.PostResponse, 0)

	if feedType == "home" {
		// 1. Local Following
		followingIDs, err := s.followRepo.GetFollowingIDs(ctx, userID)
		if err != nil {
			return nil, err
		}

		// Filter blocked users from following list
		var activeFollowing []primitive.ObjectID
		for _, id := range followingIDs {
			if !blockedMap[id] {
				activeFollowing = append(activeFollowing, id)
			}
		}

		var localResponses []dto.PostResponse
		if len(activeFollowing) > 0 {
			localPosts, err := s.postRepo.GetPostsByAuthors(ctx, activeFollowing, limit)
			if err == nil {
				localResponses, _ = s.enrichPosts(ctx, localPosts, userID)
			}
		}

		// 2. Remote Following
		var remoteResponses []dto.PostResponse
		if s.federationService != nil {
			remoteFollows, err := s.federationService.GetRemoteFollowing(ctx, userID)
			if err == nil && len(remoteFollows) > 0 {
				var actorIDs []string
				for _, rf := range remoteFollows {
					actorIDs = append(actorIDs, rf.RemoteActorID)
				}

				if len(actorIDs) > 0 {
					remotePosts, err := s.federationService.GetRemotePostsByAuthors(ctx, actorIDs, limit)
					if err == nil {
						remoteResponses, _ = s.enrichRemotePosts(ctx, remotePosts, userID)
					}
				}
			}
		}

		// Merge
		finalPosts = append(localResponses, remoteResponses...)

		// Sort by CreatedAt desc
		sort.Slice(finalPosts, func(i, j int) bool {
			return finalPosts[i].CreatedAt.After(finalPosts[j].CreatedAt)
		})

		// Trim to limit
		if int64(len(finalPosts)) > limit {
			finalPosts = finalPosts[:limit]
		}

	} else {
		// Public (Local) - Show all posts excluding blocked/hidden
		// blockedIDs = append(blockedIDs, userID) // REMOVED: Allow self posts in explore

		allPosts, err := s.postRepo.GetAllPosts(ctx, blockedIDs, limit)
		if err != nil {
			return nil, err
		}

		// Filter out hidden posts (by ID) if any
		notInterestedIDs, _ := s.postRepo.GetHiddenPostIDsByUser(ctx, userID)
		hiddenPostMap := make(map[primitive.ObjectID]bool)
		for _, id := range notInterestedIDs {
			hiddenPostMap[id] = true
		}

		var filteredPosts []models.Post
		for _, p := range allPosts {
			if !hiddenPostMap[p.ID] {
				filteredPosts = append(filteredPosts, p)
			}
		}

		// Apply recommendations if user is logged in
		if !userID.IsZero() {
			interests, err := s.recService.GetUserInterests(ctx, userID)
			if err == nil && len(interests) > 0 {
				log.Printf("DEBUG GetFeed: Prioritizing posts based on interests for user %v", userID)
				filteredPosts = s.recService.PrioritizePosts(filteredPosts, interests)
			}
		}

		finalPosts, _ = s.enrichPosts(ctx, filteredPosts, userID)
	}

	return &dto.FeedResponse{
		Posts: finalPosts,
		Total: len(finalPosts),
	}, nil
}

// enrichRemotePosts converts RemotePosts to PostResponse
func (s *PostService) enrichRemotePosts(ctx context.Context, posts []fedModels.RemotePost, currentUserID primitive.ObjectID) ([]dto.PostResponse, error) {
	if len(posts) == 0 {
		return []dto.PostResponse{}, nil
	}

	actorIDs := make([]string, 0)
	seen := make(map[string]bool)
	for _, p := range posts {
		if !seen[p.AuthorActorID] {
			actorIDs = append(actorIDs, p.AuthorActorID)
			seen[p.AuthorActorID] = true
		}
	}

	remoteUsers, err := s.federationService.GetRemoteUsersByActorIDs(ctx, actorIDs)
	if err != nil {
		log.Printf("Error fetching remote users: %v", err)
	}

	responses := make([]dto.PostResponse, 0)
	for _, p := range posts {
		username := p.Author

		avatarURL := ""

		if remoteUsers != nil {
			if user, ok := remoteUsers[p.AuthorActorID]; ok {
				username = user.Username

				avatarURL = user.AvatarURL
			}
		}

		// Check for mentions or other metadata if available in RemotePost?
		// Currently RemotePost has minimal fields.

		resp := dto.PostResponse{
			ID:                p.ID,
			Content:           p.Content,
			AuthorID:          primitive.NilObjectID, // No local author ID
			AuthorName:        username,
			AuthorDisplayName: username,
			AuthorAvatar:      avatarURL,
			// We don't have displayName in DTO yet? Check responses.go
			// DTO has AuthorName. Usually DisplayName is not in DTO?
			// Client usually uses AuthorName as username or display name?
			// responses.go only has AuthorName string.
			// Let's assume AuthorName is display name or username.
			// Ideally we want both. But DTO is restrictive.
			// We'll use username for now explicitly.

			CreatedAt:      p.CreatedAt,
			UpdatedAt:      p.UpdatedAt,
			LikeCount:      p.LikeCount,
			CommentCount:   p.CommentCount,
			AuthorInstance: p.OriginInstance,
			IsRemote:       true,
			IsLiked:        false, // Default
			IsSaved:        false,
		}
		responses = append(responses, resp)
	}
	return responses, nil
}

// GetUserPosts retrieves posts for a specific user
func (s *PostService) GetUserPosts(ctx context.Context, userID, requestingUserID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
	// Check if blocked
	isBlocked, err := s.blockService.IsBlocked(ctx, userID, requestingUserID)
	if err != nil {
		return nil, err
	}
	// Also check if requester is blocked by target (bidirectional)
	isBlockedBy, err := s.blockService.IsBlocked(ctx, requestingUserID, userID)
	if err != nil {
		return nil, err
	}

	// Check if reported
	isReported, _ := s.reportRepo.IsUserReported(ctx, requestingUserID, userID)
	if isReported {
		return &dto.FeedResponse{
			Posts: []dto.PostResponse{},
			Total: 0,
		}, nil
	}

	if isBlocked || isBlockedBy {
		return &dto.FeedResponse{
			Posts: []dto.PostResponse{},
			Total: 0,
		}, nil
	}

	posts, err := s.postRepo.GetPostsByAuthor(ctx, userID, limit)
	if err != nil {
		return nil, err
	}

	if len(posts) > 0 {
		postResponses, err := s.enrichPosts(ctx, posts, requestingUserID)
		if err != nil {
			return nil, err
		}
		return &dto.FeedResponse{
			Posts: postResponses,
			Total: len(postResponses),
		}, nil
	}

	// If no local posts found, check if this is a remote user and fetch their remote posts
	if s.federationService != nil {
		remoteUser, err := s.federationService.GetRemoteUserByID(ctx, userID)
		if err == nil && remoteUser != nil {
			remotePosts, err := s.federationService.GetRemotePostsByAuthors(ctx, []string{remoteUser.ActorID}, limit)
			if err == nil && len(remotePosts) > 0 {
				postResponses, err := s.enrichRemotePosts(ctx, remotePosts, requestingUserID)
				if err != nil {
					return nil, err
				}
				return &dto.FeedResponse{
					Posts: postResponses,
					Total: len(postResponses),
				}, nil
			}
		}
	}

	return &dto.FeedResponse{
		Posts: []dto.PostResponse{},
		Total: 0,
	}, nil
}

// GetPostByID retrieves a single post by ID with privacy checks
func (s *PostService) GetPostByID(ctx context.Context, postID, requestingUserID primitive.ObjectID) (*dto.PostResponse, error) {
	// Fetch the post
	post, err := s.postRepo.GetPostByID(ctx, postID)
	if err != nil {
		return nil, errors.New("post not found")
	}

	// Check if requesting user is blocked by post author or has blocked the author
	isBlocked, err := s.blockService.IsBlocked(ctx, post.AuthorID, requestingUserID)
	if err != nil {
		return nil, err
	}
	isBlockedBy, err := s.blockService.IsBlocked(ctx, requestingUserID, post.AuthorID)
	if err != nil {
		return nil, err
	}

	// Check if reported
	isReported, _ := s.reportRepo.IsUserReported(ctx, requestingUserID, post.AuthorID)
	if isReported {
		return nil, errors.New("access denied")
	}

	if isBlocked || isBlockedBy {
		return nil, errors.New("access denied")
	}

	// Enrich the post with author info and like status
	enrichedPosts, err := s.enrichPosts(ctx, []models.Post{*post}, requestingUserID)
	if err != nil || len(enrichedPosts) == 0 {
		return nil, errors.New("failed to load post")
	}

	return &enrichedPosts[0], nil
}

// LikePost likes a post and creates a notification
func (s *PostService) LikePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	// Check if post exists
	post, err := s.postRepo.GetPostByID(ctx, postID)
	if err != nil {
		return err
	}

	like := &models.Like{
		PostID: postID,
		UserID: userID,
	}

	if err := s.postRepo.CreateLike(ctx, like); err != nil {
		return err
	}

	// Create notification for post author (if not liking own post)
	if post.AuthorID != userID {
		notification := &models.Notification{
			UserID:          post.AuthorID,
			Type:            "like",
			RelatedEntityID: postID,
			RelatedUserID:   userID,
		}
		s.notificationRepo.CreateNotification(ctx, notification)
	}

	return nil
}

// UnlikePost removes a like from a post
func (s *PostService) UnlikePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	return s.postRepo.DeleteLike(ctx, postID, userID)
}

// CreateComment creates a comment on a post and creates a notification
func (s *PostService) CreateComment(ctx context.Context, postID, userID primitive.ObjectID, req dto.CreateCommentRequest) (*models.Comment, error) {
	// Check if post exists
	post, err := s.postRepo.GetPostByID(ctx, postID)
	if err != nil {
		return nil, err
	}

	comment := &models.Comment{
		PostID:  postID,
		UserID:  userID,
		Content: req.Content,
	}

	var parentComment *models.Comment
	if req.ParentID != "" {
		parentID, err := primitive.ObjectIDFromHex(req.ParentID)
		if err == nil {
			comment.ParentID = &parentID
			// Fetch parent comment for notification
			parentComment, _ = s.postRepo.GetCommentByID(ctx, parentID)
		}
	}

	if err := s.postRepo.CreateComment(ctx, comment); err != nil {
		return nil, err
	}

	// Create notification for post author (if not commenting on own post)
	// OR for parent comment author (if replying to someone else's comment)
	var notificationRecipientID primitive.ObjectID
	if parentComment != nil && parentComment.UserID != userID {
		// This is a reply to someone else's comment
		notificationRecipientID = parentComment.UserID
	} else if post.AuthorID != userID {
		// This is a comment on someone else's post
		notificationRecipientID = post.AuthorID
	}

	// Only create notification if there's a valid recipient
	if !notificationRecipientID.IsZero() {
		notification := &models.Notification{
			UserID:          notificationRecipientID,
			Type:            "comment",
			RelatedEntityID: postID,
			RelatedUserID:   userID,
			CommentContent:  req.Content,
		}

		// If this is a reply, add parent comment info
		if parentComment != nil {
			notification.ParentCommentID = comment.ParentID
			notification.ParentCommentContent = parentComment.Content
			// Get parent comment author's username
			if parentUser, err := s.searchRepo.GetUsersByIDs(ctx, []primitive.ObjectID{parentComment.UserID}); err == nil {
				if user := parentUser[parentComment.UserID]; user != nil {
					notification.ParentUserName = user.Username
				}
			}
		}

		s.notificationRepo.CreateNotification(ctx, notification)
	}

	// Handle Mentions in comments: @username
	s.parseAndNotifyMentions(ctx, req.Content, userID, postID)

	return comment, nil
}

// GetComments retrieves comments for a post and returns them in a flat 2-level structure (Instagram style)
func (s *PostService) GetComments(ctx context.Context, postID primitive.ObjectID) ([]dto.CommentResponse, error) {
	comments, err := s.postRepo.GetCommentsByPostID(ctx, postID)
	if err != nil {
		return nil, err
	}

	// Get unique user IDs
	userIDs := make([]primitive.ObjectID, 0)
	userIDSet := make(map[primitive.ObjectID]bool)
	for _, comment := range comments {
		if !userIDSet[comment.UserID] {
			userIDs = append(userIDs, comment.UserID)
			userIDSet[comment.UserID] = true
		}
	}

	// Fetch user information
	users, err := s.searchRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	// Map to store all comment responses by their ID for easy lookup
	allMap := make(map[primitive.ObjectID]*dto.CommentResponse)
	roots := make([]*dto.CommentResponse, 0)
	children := make([]*dto.CommentResponse, 0)

	// First pass: Create all response objects
	for _, comment := range comments {
		user := users[comment.UserID]
		if user == nil {
			continue
		}

		// Skip comments from deactivated users
		if user.IsDeactivated {
			continue
		}

		resp := &dto.CommentResponse{
			ID:         comment.ID,
			PostID:     comment.PostID,
			UserID:     comment.UserID,
			UserName:   user.Username,
			UserAvatar: user.AvatarURL,
			Content:    comment.Content,
			ParentID:   comment.ParentID,
			Replies:    []dto.CommentResponse{},
			CreatedAt:  comment.CreatedAt,
		}
		allMap[comment.ID] = resp
		if comment.ParentID == nil {
			roots = append(roots, resp)
		} else {
			children = append(children, resp)
		}
	}

	// Second pass: Set ParentUserName for all children IF they are replying to another reply (Instagram style)
	for _, child := range children {
		if parent, exists := allMap[*child.ParentID]; exists {
			if parent.ParentID != nil {
				child.ParentUserName = parent.UserName
			}
		}
	}

	// Third pass: Flatten hierarchy to 2 levels (Instagram style)
	// All descendants of a root comment are placed in that root's Replies list.
	for _, child := range children {
		// Find the ultimate root ancestor of this child
		curr := child
		for curr.ParentID != nil {
			parent, exists := allMap[*curr.ParentID]
			if !exists {
				// Orphaned child, treat its current parent as the 'relative' root if possible
				break
			}
			if parent.ParentID == nil {
				// We found the thread root!
				parent.Replies = append(parent.Replies, *child)
				break
			}
			// Move up one level
			curr = parent
		}
	}

	// Build the final response list preserving root order
	finalRoots := make([]dto.CommentResponse, 0)
	for _, r := range roots {
		finalRoots = append(finalRoots, *r)
	}

	return finalRoots, nil
}

// DeleteComment deletes a comment if it's within the 2-minute window
func (s *PostService) DeleteComment(ctx context.Context, commentID, userID primitive.ObjectID) error {
	comment, err := s.postRepo.GetCommentByID(ctx, commentID)
	if err != nil {
		return err
	}

	// Check ownership
	if comment.UserID != userID {
		return errors.New("unauthorized: you can only delete your own comments")
	}

	// Check time (2 minutes)
	if time.Since(comment.CreatedAt).Minutes() > 2 {
		return errors.New("cannot delete comment after 2 minutes")
	}

	return s.postRepo.DeleteComment(ctx, commentID)
}

// DeletePost deletes a post if the user is the owner
func (s *PostService) DeletePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	post, err := s.postRepo.GetPostByIDAdmin(ctx, postID)
	if err != nil {
		return err
	}

	// Check ownership
	if post.AuthorID != userID {
		return errors.New("unauthorized: you can only delete your own posts")
	}

	return s.postRepo.DeletePost(ctx, postID)
}

// getValidUsernamesFromContent extracts @mentions and returns only those that belong to existing users
func (s *PostService) getValidUsernamesFromContent(ctx context.Context, content string) []string {
	re := regexp.MustCompile(`@(\w+)`)
	matches := re.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return nil
	}

	mentionMap := make(map[string]bool)
	var usernames []string
	for _, match := range matches {
		username := match[1]
		if !mentionMap[username] {
			mentionMap[username] = true
			usernames = append(usernames, username)
		}
	}

	if len(usernames) > 0 {
		mentionedUsers, err := s.searchRepo.GetUsersByUsernames(ctx, usernames)
		if err == nil {
			var validUsernames []string
			for _, mentionedUser := range mentionedUsers {
				validUsernames = append(validUsernames, mentionedUser.Username)
			}
			return validUsernames
		}
	}
	return nil
}

// parseAndNotifyMentions scans content for @username or @username@domain, validates them, and creates notifications
func (s *PostService) parseAndNotifyMentions(ctx context.Context, content string, authorID, postID primitive.ObjectID) []string {
	// Support @username and @username@domain
	re := regexp.MustCompile(`@(\w+)(?:@([\w.-]+))?`)
	matches := re.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return nil
	}

	// Fetch author for notification context
	authorUsers, _ := s.searchRepo.GetUsersByIDs(ctx, []primitive.ObjectID{authorID})
	author, ok := authorUsers[authorID]
	if !ok {
		return nil
	}

	mentionMap := make(map[string]bool)
	var validMentions []string

	for _, match := range matches {
		username := match[1]
		domain := ""
		if len(match) > 2 {
			domain = match[2]
		}

		fullHandle := username
		if domain != "" && domain != config.AppConfig.InstanceDomain {
			fullHandle = username + "@" + domain
		}

		if mentionMap[fullHandle] {
			continue
		}
		mentionMap[fullHandle] = true

		if domain == "" || domain == config.AppConfig.InstanceDomain {
			// Local Mention
			mentionedUsers, err := s.searchRepo.GetUsersByUsernames(ctx, []string{username})
			if err == nil && len(mentionedUsers) > 1 { // Should only find one but GetUsersByUsernames returns slice
				// Find EXACT match if possible (case insensitive)
				var foundLocal *identityModels.User
				for _, mu := range mentionedUsers {
					if strings.EqualFold(mu.Username, username) {
						foundLocal = &mu
						break
					}
				}

				if foundLocal != nil && foundLocal.ID != authorID {
					validMentions = append(validMentions, foundLocal.Username)
					notification := &models.Notification{
						UserID:          foundLocal.ID,
						Type:            "mention",
						RelatedEntityID: postID,
						RelatedUserID:   authorID,
						CreatedAt:       time.Now(),
					}
					s.notificationRepo.CreateNotification(ctx, notification)
				}
			} else if err == nil && len(mentionedUsers) == 1 {
				foundLocal := &mentionedUsers[0]
				if foundLocal.ID != authorID {
					validMentions = append(validMentions, foundLocal.Username)
					notification := &models.Notification{
						UserID:          foundLocal.ID,
						Type:            "mention",
						RelatedEntityID: postID,
						RelatedUserID:   authorID,
						CreatedAt:       time.Now(),
					}
					s.notificationRepo.CreateNotification(ctx, notification)
				}
			}
		} else {
			// Federated Mention
			if s.federationService != nil {
				// Check if we have this remote user cached
				remoteUser, err := s.federationService.ResolveRemoteUser(ctx, fullHandle)
				if err == nil && remoteUser != nil {
					validMentions = append(validMentions, fullHandle)

					// Create a local notification stub for tracking
					// We use a fake ID or map it to a stub user if needed,
					// but primarily we send the federation activity
					notification := &models.Notification{
						Type:            "mention",
						RelatedEntityID: postID,
						RelatedUserID:   authorID,
						CreatedAt:       time.Now(),
					}

					// Send to remote instance
					s.federationService.SendRemoteNotification(ctx, domain, notification, author)
				}
			}
		}
	}
	return validMentions
}

// enrichPosts adds author information and like status to posts
func (s *PostService) enrichPosts(ctx context.Context, posts []models.Post, currentUserID primitive.ObjectID) ([]dto.PostResponse, error) {
	if len(posts) == 0 {
		return []dto.PostResponse{}, nil
	}

	// Get unique author IDs
	authorIDs := make([]primitive.ObjectID, 0)
	authorIDSet := make(map[primitive.ObjectID]bool)
	for _, post := range posts {
		if !authorIDSet[post.AuthorID] {
			authorIDs = append(authorIDs, post.AuthorID)
			authorIDSet[post.AuthorID] = true
		}
	}
	log.Printf("DEBUG enrichPosts: Need to fetch %d unique authors", len(authorIDs))
	for i, id := range authorIDs {
		log.Printf("  Author %d: %v", i+1, id)
	}

	// Fetch author information
	authors, err := s.searchRepo.GetUsersByIDs(ctx, authorIDs)
	if err != nil {
		log.Printf("ERROR enrichPosts: Failed to fetch user info: %v", err)
		return nil, err
	}

	// Dynamic Mention Extraction for Legacy Posts
	// Collect all usernames mentioned in posts that are missing MentionedUsernames metadata
	re := regexp.MustCompile(`@(\w+)`)
	legacyMentionsToResolve := make(map[string]bool)
	for _, post := range posts {
		if post.MentionedUsernames == nil {
			matches := re.FindAllStringSubmatch(post.Content, -1)
			for _, match := range matches {
				legacyMentionsToResolve[match[1]] = true
			}
		}
	}

	// Resolve these usernames to get only the existing ones
	validLegacyUsernames := make(map[string]bool)
	if len(legacyMentionsToResolve) > 0 {
		usernames := make([]string, 0, len(legacyMentionsToResolve))
		for u := range legacyMentionsToResolve {
			usernames = append(usernames, u)
		}
		users, err := s.searchRepo.GetUsersByUsernames(ctx, usernames)
		if err == nil {
			for _, user := range users {
				validLegacyUsernames[user.Username] = true
			}
		}
	}

	log.Printf("DEBUG enrichPosts: Successfully fetched %d users from database", len(authors))
	for id, user := range authors {
		if user != nil {
			log.Printf("  User %v: %s (avatar: %s)", id, user.Username, user.AvatarURL)
		} else {
			log.Printf("  User %v: <nil>", id)
		}
	}

	// Build post responses (filter out posts whose authors can't be found or are deactivated)
	// Also filter out posts from private accounts if the user doesn't follow them
	var followingMap map[primitive.ObjectID]bool
	fetchedFollowing := false

	postResponses := make([]dto.PostResponse, 0, len(posts))
	for _, post := range posts {
		author := authors[post.AuthorID]

		// Skip posts from authors who don't exist or were deleted
		if author == nil {
			log.Printf("DEBUG enrichPosts: Skipping post %v - author %v not found in database", post.ID, post.AuthorID)
			continue
		}

		// Skip posts from deactivated users
		if author.IsDeactivated {
			log.Printf("DEBUG enrichPosts: Skipping post %v - author %v is deactivated", post.ID, post.AuthorID)
			continue
		}

		// Privacy Check: private account and not self
		if author.ProfileVisibility == "followers" && author.ID != currentUserID {
			// Lazy load following list
			if !fetchedFollowing {
				fIDs, err := s.followRepo.GetFollowingIDs(ctx, currentUserID)
				if err != nil {
					log.Printf("ERROR enrichPosts: Failed to get following IDs for privacy check: %v", err)
					// Fail safe: assume not following if error? Or skip check?
					// Safe default is to hide if we can't verify permissions
				}
				followingMap = make(map[primitive.ObjectID]bool)
				for _, id := range fIDs {
					followingMap[id] = true
				}
				fetchedFollowing = true
			}

			if !followingMap[author.ID] {
				log.Printf("DEBUG enrichPosts: Skipping post %v - author %v is private and not followed", post.ID, post.AuthorID)
				continue
			}
		}

		// Check if current user has liked this post
		isLiked, _ := s.postRepo.CheckIfLiked(ctx, post.ID, currentUserID)
		// Check if current user has saved this post
		isSaved, _ := s.postRepo.CheckIfSaved(ctx, post.ID, currentUserID)

		// Handle mentioned usernames (legacy support)
		mentionedUsernames := post.MentionedUsernames
		if mentionedUsernames == nil {
			// Extract and filter valid ones from the content based on our batch result
			matches := re.FindAllStringSubmatch(post.Content, -1)
			uniqueValid := make(map[string]bool)
			for _, match := range matches {
				username := match[1]
				if validLegacyUsernames[username] {
					uniqueValid[username] = true
				}
			}
			if len(uniqueValid) > 0 {
				mentionedUsernames = make([]string, 0, len(uniqueValid))
				for u := range uniqueValid {
					mentionedUsernames = append(mentionedUsernames, u)
				}

				// Lazy DB update: Save the resolved mentions so we don't have to do it again
				// Doing this in a goroutine to avoid slowing down the response
				go func(pID primitive.ObjectID, mus []string) {
					s.postRepo.UpdatePostMentions(context.Background(), pID, mus)
				}(post.ID, mentionedUsernames)
			} else {
				// Mark as initialized so we don't try again repeatedly if none match
				mentionedUsernames = []string{}
			}
		}

		postResponses = append(postResponses, dto.PostResponse{
			ID:                 post.ID,
			AuthorID:           post.AuthorID,
			AuthorName:         author.Username,
			AuthorDisplayName:  author.DisplayName,
			AuthorAvatar:       author.AvatarURL,
			Content:            post.Content,
			MediaURL:           post.MediaURL,
			MediaType:          post.MediaType,
			LikeCount:          post.LikeCount,
			CommentCount:       post.CommentCount,
			IsLiked:            isLiked,
			IsSaved:            isSaved,
			MentionedUsernames: mentionedUsernames,
			CreatedAt:          post.CreatedAt,
			UpdatedAt:          post.UpdatedAt,
		})
	}

	log.Printf("DEBUG enrichPosts: Returning %d enriched posts (filtered from %d original posts)", len(postResponses), len(posts))
	return postResponses, nil
}

// GetUserLikedPosts retrieves posts liked by a specific user
func (s *PostService) GetUserLikedPosts(ctx context.Context, userID, requestingUserID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
	if userID.Hex() != requestingUserID.Hex() {
		log.Printf("DEBUG: Activity private check failed in GetUserLikedPosts. userID: %s, requestingUserID: %s", userID.Hex(), requestingUserID.Hex())
		return nil, errors.New("activity is private")
	}
	posts, err := s.postRepo.GetLikedPostsByUser(ctx, userID, limit)
	if err != nil {
		return nil, err
	}

	postResponses, err := s.enrichPosts(ctx, posts, requestingUserID)
	if err != nil {
		return nil, err
	}

	return &dto.FeedResponse{
		Posts: postResponses,
		Total: len(postResponses),
	}, nil
}

// GetUserCommentedPosts retrieves posts commented on by a specific user
func (s *PostService) GetUserCommentedPosts(ctx context.Context, userID, requestingUserID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
	if userID.Hex() != requestingUserID.Hex() {
		log.Printf("DEBUG: Activity private check failed in GetUserCommentedPosts. userID: %s, requestingUserID: %s", userID.Hex(), requestingUserID.Hex())
		return nil, errors.New("activity is private")
	}
	posts, err := s.postRepo.GetCommentedPostsByUser(ctx, userID, limit)
	if err != nil {
		return nil, err
	}

	postResponses, err := s.enrichPosts(ctx, posts, requestingUserID)
	if err != nil {
		return nil, err
	}

	return &dto.FeedResponse{
		Posts: postResponses,
		Total: len(postResponses),
	}, nil
}

// GetPostLikers retrieves the users who liked a post, but only if the requesting user is the author
func (s *PostService) GetPostLikers(ctx context.Context, postID, userID primitive.ObjectID) ([]dto.LikerResponse, error) {
	// 1. Fetch post to check ownership
	post, err := s.postRepo.GetPostByID(ctx, postID)
	if err != nil {
		return nil, errors.New("post not found")
	}

	// 2. Check authorization: only author can see the list of likers
	if post.AuthorID != userID {
		return nil, errors.New("unauthorized: you can only view likers of your own posts")
	}

	// 3. Get all likes for this post
	likes, err := s.postRepo.GetLikesByPostID(ctx, postID)
	if err != nil {
		return nil, err
	}

	if len(likes) == 0 {
		return []dto.LikerResponse{}, nil
	}

	// 4. Extract unique user IDs
	userIDs := make([]primitive.ObjectID, 0)
	for _, like := range likes {
		userIDs = append(userIDs, like.UserID)
	}

	// 5. Fetch user information
	users, err := s.searchRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	// 6. Build response
	likerResponses := make([]dto.LikerResponse, 0, len(likes))
	for _, like := range likes {
		user := users[like.UserID]
		if user == nil {
			continue // Skip if user not found
		}

		// Skip deactivated users
		if user.IsDeactivated {
			continue
		}

		likerResponses = append(likerResponses, dto.LikerResponse{
			UserID:     like.UserID,
			UserName:   user.Username,
			UserAvatar: user.AvatarURL,
		})
	}

	return likerResponses, nil
}

// SavePost logic
func (s *PostService) SavePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	savedPost := &models.SavedPost{
		PostID: postID,
		UserID: userID,
	}
	return s.postRepo.SavePost(ctx, savedPost)
}

// UnsavePost logic
func (s *PostService) UnsavePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	return s.postRepo.UnsavePost(ctx, userID, postID)
}

// GetSavedPosts retrieves posts saved by a user
func (s *PostService) GetSavedPosts(ctx context.Context, userID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
	postIDs, err := s.postRepo.GetSavedPostIDsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	if len(postIDs) == 0 {
		return &dto.FeedResponse{Posts: []dto.PostResponse{}, Total: 0}, nil
	}

	// Fetch actual posts
	allPosts := make([]models.Post, 0)
	for _, id := range postIDs {
		post, err := s.postRepo.GetPostByID(ctx, id)
		if err == nil {
			allPosts = append(allPosts, *post)
		}
	}

	postResponses, err := s.enrichPosts(ctx, allPosts, userID)
	if err != nil {
		return nil, err
	}

	return &dto.FeedResponse{Posts: postResponses, Total: len(postResponses)}, nil
}

// ReportPost logic
func (s *PostService) ReportPost(ctx context.Context, postID, userID primitive.ObjectID, req dto.ReportPostRequest) error {
	// Verify post exists
	post, err := s.postRepo.GetPostByID(ctx, postID)
	if err != nil {
		return errors.New("post not found")
	}

	// Prevent reporting own posts
	if post.AuthorID == userID {
		return errors.New("you cannot report your own post")
	}

	report := &models.ReportedPost{
		PostID:     postID,
		ReporterID: userID,
		Reason:     req.Reason,
	}
	return s.postRepo.CreateReport(ctx, report)
}

// TrackInteraction handles "Interested" and "Not Interested"
func (s *PostService) TrackInteraction(ctx context.Context, postID, userID primitive.ObjectID, req dto.PostInteractionRequest) error {
	interaction := &models.PostInteraction{
		PostID: postID,
		UserID: userID,
		Type:   req.Type,
	}
	return s.postRepo.UpsertInteraction(ctx, interaction)
}

// GetUserPostsByUsername retrieves posts for a specific user by username (for federation)
func (s *PostService) GetUserPostsByUsername(ctx context.Context, username string, requestingUserID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
	users, err := s.searchRepo.GetUsersByUsernames(ctx, []string{username})
	if err != nil || len(users) == 0 {
		return nil, errors.New("user not found")
	}

	// Exact match check
	var userID primitive.ObjectID
	found := false
	for _, u := range users {
		if strings.EqualFold(u.Username, username) {
			userID = u.ID
			found = true
			break
		}
	}

	if !found {
		return nil, errors.New("user not found")
	}

	return s.GetUserPosts(ctx, userID, requestingUserID, limit)
}

// GetAllReports retrieves all reports for admin
func (s *PostService) GetAllReports(ctx context.Context) ([]dto.ReportResponse, error) {
	reports, err := s.postRepo.GetAllReports(ctx)
	if err != nil {
		return nil, err
	}

	responses := make([]dto.ReportResponse, 0, len(reports))
	for _, report := range reports {
		post, _ := s.postRepo.GetPostByIDAdmin(ctx, report.PostID)

		postContent := "[Deleted Post]"
		authorName := "Unknown"
		reporterName := "Unknown"

		if post != nil {
			postContent = post.Content
			// Only try to fetch author if we have a post
			users, _ := s.searchRepo.GetUsersByIDs(ctx, []primitive.ObjectID{post.AuthorID})
			if users != nil {
				if author := users[post.AuthorID]; author != nil {
					authorName = author.Username
				}
			}
		}

		// Fetch reporter
		users, _ := s.searchRepo.GetUsersByIDs(ctx, []primitive.ObjectID{report.ReporterID})
		if users != nil {
			if reporter := users[report.ReporterID]; reporter != nil {
				reporterName = reporter.Username
			}
		}

		responses = append(responses, dto.ReportResponse{
			ID:           report.ID,
			ReporterID:   report.ReporterID,
			PostID:       report.PostID,
			PostContent:  postContent,
			AuthorName:   authorName,
			ReporterName: reporterName,
			Reason:       report.Reason,
			Status:       report.Status,
			CreatedAt:    report.CreatedAt,
		})
	}

	return responses, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
