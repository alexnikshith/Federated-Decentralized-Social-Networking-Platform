package service

import (
	"context"
	"errors"
	"federated-social/backend/config"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	federationService "federated-social/backend/epics/federation/service"
	safetyRepo "federated-social/backend/epics/safety/repository"
	safetyService "federated-social/backend/epics/safety/service"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PostService struct {
	postRepo          *repository.PostRepository
	followRepo        *repository.FollowRepository
	searchRepo        *repository.SearchRepository
	notificationRepo  *repository.NotificationRepository
	blockService      *safetyService.BlockService
	federationService *federationService.FederationService
}

func NewPostService() *PostService {
	var fedService *federationService.FederationService
	if config.AppConfig.FederationEnabled {
		fedService = federationService.NewFederationService()
	}

	return &PostService{
		postRepo:          repository.NewPostRepository(),
		followRepo:        repository.NewFollowRepository(),
		searchRepo:        repository.NewSearchRepository(),
		notificationRepo:  repository.NewNotificationRepository(),
		blockService:      safetyService.NewBlockService(safetyRepo.NewBlockRepository()),
		federationService: fedService,
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

	// Trigger federation if enabled
	if s.federationService != nil {
		// Get user info for federation
		users, err := s.searchRepo.GetUsersByIDs(ctx, []primitive.ObjectID{userID})
		if err == nil && users[userID] != nil {
			user := users[userID]

			// Broadcast to all trusted instances asynchronously
			go func() {
				instances, err := s.federationService.GetTrustedInstances(context.Background())
				if err != nil {
					log.Printf("Failed to get trusted instances: %v", err)
					return
				}

				for _, instance := range instances {
					if err := s.federationService.SendCreatePost(context.Background(), post, user, instance.Domain); err != nil {
						log.Printf("Federation to %s failed for post %s: %v", instance.Domain, post.ID.Hex(), err)
					} else {
						log.Printf("Federation to %s succeeded for post %s", instance.Domain, post.ID.Hex())
					}
				}
			}()
		}
	}

	return post, nil
}

// GetFeed retrieves the feed for a user with prioritized algorithm
// Shows posts from followed users first (newest), then posts from everyone else.
// It respects block lists and hidden/reported posts.
// The feed composition is: 1. Main Feed (Followed Users + Global) 2. "Interested" Recommendations boosted/interleaved.
func (s *PostService) GetFeed(ctx context.Context, userID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
	log.Printf("DEBUG GetFeed: Starting prioritized feed retrieval for user %v, limit=%d", userID, limit)

	// Get blocking info (bidirectional)
	blockedIDs, err := s.blockService.GetHiddenUserIDs(ctx, userID)
	if err != nil {
		log.Printf("ERROR GetFeed: Failed to get blocked IDs: %v", err)
		return nil, err
	}
	blockedMap := make(map[primitive.ObjectID]bool)
	for _, id := range blockedIDs {
		blockedMap[id] = true
	}

	// Get hidden post IDs (only not interested)
	// Reported posts are now handled by DB status="under_review"
	notInterestedIDs, _ := s.postRepo.GetHiddenPostIDsByUser(ctx, userID)
	hiddenPostMap := make(map[primitive.ObjectID]bool)
	for _, id := range notInterestedIDs {
		hiddenPostMap[id] = true
	}

	// Get list of users the current user follows
	followingIDs, err := s.followRepo.GetFollowingIDs(ctx, userID)
	if err != nil {
		log.Printf("ERROR GetFeed: Failed to get following list: %v", err)
		return nil, err
	}

	// Filter blocked users from following list
	var activeFollowing []primitive.ObjectID
	for _, id := range followingIDs {
		if !blockedMap[id] {
			activeFollowing = append(activeFollowing, id)
		}
	}
	log.Printf("DEBUG GetFeed: User follows %d users (%d active)", len(followingIDs), len(activeFollowing))

	var allPosts []models.Post

	if len(activeFollowing) > 0 {
		// User follows active users - use prioritized algorithm
		log.Printf("DEBUG GetFeed: Fetching posts from followed users")

		// Get posts from followed users (newest first)
		followedPosts, err := s.postRepo.GetPostsByAuthors(ctx, activeFollowing, limit)
		if err != nil {
			log.Printf("ERROR GetFeed: Failed to get posts from followed users: %v", err)
			return nil, err
		}
		log.Printf("DEBUG GetFeed: Retrieved %d posts from followed users", len(followedPosts))

		// Calculate exclusions: activeFollowing + blockedIDs
		exclusions := append([]primitive.ObjectID{}, activeFollowing...)
		exclusions = append(exclusions, blockedIDs...)

		// Get posts from everyone else (newest first)
		otherPosts, err := s.postRepo.GetPostsExcludingAuthors(ctx, exclusions, limit)
		if err != nil {
			log.Printf("ERROR GetFeed: Failed to get posts from other users: %v", err)
			return nil, err
		}
		log.Printf("DEBUG GetFeed: Retrieved %d posts from other users", len(otherPosts))

		// Combine: followed posts first, then other posts
		allPosts = append(followedPosts, otherPosts...)
		log.Printf("DEBUG GetFeed: Combined total: %d posts", len(allPosts))

		// Add "Interested" recommendations: posts from authors user is "interested" in
		interestedAuthorIDs, _ := s.postRepo.GetInterestedAuthorIDsByUser(ctx, userID)
		if len(interestedAuthorIDs) > 0 {
			recommendedPosts, err := s.postRepo.GetPostsByAuthors(ctx, interestedAuthorIDs, 5) // Get top 5 newest
			if err == nil && len(recommendedPosts) > 0 {
				// Interleave or prepend some recommended posts if they aren't already there
				postMap := make(map[primitive.ObjectID]bool)
				for _, p := range allPosts {
					postMap[p.ID] = true
				}

				newRecs := make([]models.Post, 0)
				for _, p := range recommendedPosts {
					if !postMap[p.ID] {
						newRecs = append(newRecs, p)
					}
				}

				if len(newRecs) > 0 {
					// Prepend up to 3 recommendations to boost them
					allPosts = append(newRecs[:min(len(newRecs), 3)], allPosts...)
				}
			}
		}

		// Trim to limit
		if int64(len(allPosts)) > limit {
			allPosts = allPosts[:limit]
			log.Printf("DEBUG GetFeed: Trimmed to limit: %d posts", len(allPosts))
		}
	} else {
		// User follows nobody (or only blocked people) - show all posts chronologically (excluding blocks)
		log.Printf("DEBUG GetFeed: User follows nobody, showing all posts")
		allPosts, err = s.postRepo.GetAllPosts(ctx, blockedIDs, limit*2) // Fetch more to account for filtering
		if err != nil {
			log.Printf("ERROR GetFeed: Failed to get all posts: %v", err)
			return nil, err
		}
		log.Printf("DEBUG GetFeed: Retrieved %d posts from all users", len(allPosts))
	}

	// Filter out hidden posts
	filteredPosts := make([]models.Post, 0)
	for _, post := range allPosts {
		if !hiddenPostMap[post.ID] {
			filteredPosts = append(filteredPosts, post)
		}
		if int64(len(filteredPosts)) >= limit {
			break
		}
	}
	allPosts = filteredPosts

	// Enrich posts with author information and like status
	postResponses, err := s.enrichPosts(ctx, allPosts, userID)
	if err != nil {
		log.Printf("ERROR GetFeed: Failed to enrich posts: %v", err)
		return nil, err
	}
	log.Printf("DEBUG GetFeed: After enrichment, returning %d posts to frontend", len(postResponses))

	return &dto.FeedResponse{
		Posts: postResponses,
		Total: len(postResponses),
	}, nil
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

	postResponses, err := s.enrichPosts(ctx, posts, requestingUserID)
	if err != nil {
		return nil, err
	}

	return &dto.FeedResponse{
		Posts: postResponses,
		Total: len(postResponses),
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

		postResponses = append(postResponses, dto.PostResponse{
			ID:           post.ID,
			AuthorID:     post.AuthorID,
			AuthorName:   author.Username,
			AuthorAvatar: author.AvatarURL,
			Content:      post.Content,
			MediaURL:     post.MediaURL,
			MediaType:    post.MediaType,
			LikeCount:    post.LikeCount,
			CommentCount: post.CommentCount,
			IsLiked:      isLiked,
			IsSaved:      isSaved,
			CreatedAt:    post.CreatedAt,
			UpdatedAt:    post.UpdatedAt,
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
