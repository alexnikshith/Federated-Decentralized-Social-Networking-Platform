package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	"log"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PostService struct {
	postRepo         *repository.PostRepository
	followRepo       *repository.FollowRepository
	searchRepo       *repository.SearchRepository
	notificationRepo *repository.NotificationRepository
}

func NewPostService() *PostService {
	return &PostService{
		postRepo:         repository.NewPostRepository(),
		followRepo:       repository.NewFollowRepository(),
		searchRepo:       repository.NewSearchRepository(),
		notificationRepo: repository.NewNotificationRepository(),
	}
}

// CreatePost creates a new post
func (s *PostService) CreatePost(ctx context.Context, userID primitive.ObjectID, req dto.CreatePostRequest) (*models.Post, error) {
	post := &models.Post{
		AuthorID: userID,
		Content:  req.Content,
	}

	if err := s.postRepo.CreatePost(ctx, post); err != nil {
		return nil, err
	}

	return post, nil
}

// GetFeed retrieves the feed for a user (all posts in chronological order)
func (s *PostService) GetFeed(ctx context.Context, userID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
	// For now, show ALL posts to users can see content from everyone
	// You can later add a "Following" filter as an option

	log.Printf("DEBUG GetFeed: Starting feed retrieval for user %v, limit=%d", userID, limit)

	// Create a slice with just the user ID to pass to GetFeed
	// But we'll modify the repository method to get all posts
	var posts []models.Post
	var err error

	// Get all posts (pass empty slice means get all)
	posts, err = s.postRepo.GetAllPosts(ctx, limit)
	if err != nil {
		log.Printf("ERROR GetFeed: Failed to get all posts: %v", err)
		return nil, err
	}
	log.Printf("DEBUG GetFeed: Retrieved %d posts from database", len(posts))
	for i, post := range posts {
		log.Printf("  Post %d: ID=%v, AuthorID=%v, Content=%.40s", i+1, post.ID, post.AuthorID, post.Content)
	}

	// Enrich posts with author information and like status
	postResponses, err := s.enrichPosts(ctx, posts, userID)
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

	if err := s.postRepo.CreateComment(ctx, comment); err != nil {
		return nil, err
	}

	// Create notification for post author (if not commenting on own post)
	if post.AuthorID != userID {
		notification := &models.Notification{
			UserID:          post.AuthorID,
			Type:            "comment",
			RelatedEntityID: postID,
			RelatedUserID:   userID,
		}
		s.notificationRepo.CreateNotification(ctx, notification)
	}

	return comment, nil
}

// GetComments retrieves comments for a post with user information
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

	// Build comment responses (filter out comments from deleted users)
	commentResponses := make([]dto.CommentResponse, 0, len(comments))
	for _, comment := range comments {
		user := users[comment.UserID]

		// Skip comments from users who don't exist or were deleted
		if user == nil {
			continue
		}

		commentResponses = append(commentResponses, dto.CommentResponse{
			ID:         comment.ID,
			PostID:     comment.PostID,
			UserID:     comment.UserID,
			UserName:   user.Username,
			UserAvatar: user.AvatarURL,
			Content:    comment.Content,
			CreatedAt:  comment.CreatedAt,
		})
	}

	return commentResponses, nil
}

// DeletePost deletes a post if the user is the owner
func (s *PostService) DeletePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	post, err := s.postRepo.GetPostByID(ctx, postID)
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

	// Build post responses (filter out posts whose authors can't be found)
	postResponses := make([]dto.PostResponse, 0, len(posts))
	for _, post := range posts {
		author := authors[post.AuthorID]

		// Skip posts from authors who don't exist or were deleted
		if author == nil {
			log.Printf("DEBUG enrichPosts: Skipping post %v - author %v not found in database", post.ID, post.AuthorID)
			continue
		}

		// Check if current user has liked this post
		isLiked, _ := s.postRepo.CheckIfLiked(ctx, post.ID, currentUserID)

		postResponses = append(postResponses, dto.PostResponse{
			ID:           post.ID,
			AuthorID:     post.AuthorID,
			AuthorName:   author.Username,
			AuthorAvatar: author.AvatarURL,
			Content:      post.Content,
			LikeCount:    post.LikeCount,
			CommentCount: post.CommentCount,
			IsLiked:      isLiked,
			CreatedAt:    post.CreatedAt,
			UpdatedAt:    post.UpdatedAt,
		})
	}

	log.Printf("DEBUG enrichPosts: Returning %d enriched posts (filtered from %d original posts)", len(postResponses), len(posts))
	return postResponses, nil
}

// GetUserLikedPosts retrieves posts liked by a specific user
func (s *PostService) GetUserLikedPosts(ctx context.Context, userID, requestingUserID primitive.ObjectID, limit int64) (*dto.FeedResponse, error) {
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
