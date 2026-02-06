package service

import (
	"context"
	"federated-social/backend/config"
	contentDTO "federated-social/backend/epics/content-sharing/dto"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	federationModels "federated-social/backend/epics/federation/models"
	federationRepo "federated-social/backend/epics/federation/repository"
	"federated-social/backend/epics/identity/repository"
	"fmt"
	"log"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FederatedFeedService struct {
	postRepo       *contentRepo.PostRepository
	remotePostRepo *federationRepo.RemotePostRepository
	searchRepo     *contentRepo.SearchRepository
	remoteUserRepo *federationRepo.RemoteUserRepository
	userRepo       *repository.UserRepository
}

func NewFederatedFeedService() *FederatedFeedService {
	return &FederatedFeedService{
		postRepo:       contentRepo.NewPostRepository(),
		remotePostRepo: federationRepo.NewRemotePostRepository(),
		searchRepo:     contentRepo.NewSearchRepository(),
		remoteUserRepo: federationRepo.NewRemoteUserRepository(),
		userRepo:       repository.NewUserRepository(),
	}
}

// FeedPost represents a unified feed post (local or remote)
type FeedPost struct {
	ID             string    `json:"id"`
	Author         string    `json:"author"` // username or username@instance
	AuthorAvatar   string    `json:"author_avatar"`
	Content        string    `json:"content"`
	LikeCount      int       `json:"like_count"`
	CommentCount   int       `json:"comment_count"`
	IsRemote       bool      `json:"is_remote"`
	OriginInstance string    `json:"origin_instance,omitempty"`
	IsLiked        bool      `json:"is_liked"`
	IsSaved        bool      `json:"is_saved"`
	CreatedAt      time.Time `json:"created_at"`
}

// GetFederatedFeed retrieves a combined feed of local and remote posts
func (s *FederatedFeedService) GetFederatedFeed(ctx context.Context, userID primitive.ObjectID, limit int64) (*contentDTO.FeedResponse, error) {
	if !config.AppConfig.FederationEnabled {
		// Federation disabled, just return local posts
		log.Println("Federation disabled, returning local posts only")
		return s.getLocalFeedOnly(ctx, userID, limit)
	}

	log.Printf("Fetching federated feed for user %s with limit %d", userID.Hex(), limit)

	// Fetch local posts
	localPosts, err := s.postRepo.GetAllPosts(ctx, []primitive.ObjectID{}, limit)
	if err != nil {
		log.Printf("Error fetching local posts: %v", err)
		return nil, err
	}
	log.Printf("Fetched %d local posts", len(localPosts))

	// Fetch remote posts
	remotePosts, err := s.remotePostRepo.GetFederatedFeed(ctx, limit)
	if err != nil {
		log.Printf("Error fetching remote posts: %v", err)
		// Continue with local posts only
		remotePosts = []federationModels.RemotePost{}
	}
	log.Printf("Fetched %d remote posts", len(remotePosts))

	// Convert to unified feed posts
	unifiedFeed := make([]FeedPost, 0, len(localPosts)+len(remotePosts))

	// Add local posts
	for _, post := range localPosts {
		author, _ := s.userRepo.FindByID(ctx, post.AuthorID)
		authorName := "unknown"
		authorAvatar := ""
		if author != nil {
			authorName = author.Username
			authorAvatar = author.AvatarURL
		}

		isLiked, _ := s.postRepo.CheckIfLiked(ctx, post.ID, userID)
		isSaved, _ := s.postRepo.CheckIfSaved(ctx, post.ID, userID)

		unifiedFeed = append(unifiedFeed, FeedPost{
			ID:             post.ID.Hex(),
			Author:         authorName,
			AuthorAvatar:   authorAvatar,
			Content:        post.Content,
			LikeCount:      post.LikeCount,
			CommentCount:   post.CommentCount,
			IsRemote:       false,
			OriginInstance: config.AppConfig.InstanceName,
			IsLiked:        isLiked,
			IsSaved:        isSaved,
			CreatedAt:      post.CreatedAt,
		})
	}

	// Add remote posts
	for _, post := range remotePosts {
		// Extract username from "username@instance" format
		username := post.Author
		if len(post.Author) > 0 {
			// Author is already in "username@instance" format
			username = post.Author
		}

		unifiedFeed = append(unifiedFeed, FeedPost{
			ID:             post.RemotePostID,
			Author:         username,
			AuthorAvatar:   "", // Remote avatars not cached yet
			Content:        post.Content,
			LikeCount:      post.LikeCount,
			CommentCount:   post.CommentCount,
			IsRemote:       true,
			OriginInstance: post.OriginInstance,
			IsLiked:        false, // Remote posts can't be liked locally (for now)
			IsSaved:        false,
			CreatedAt:      post.CreatedAt,
		})
	}

	// Sort by timestamp (newest first)
	sort.Slice(unifiedFeed, func(i, j int) bool {
		return unifiedFeed[i].CreatedAt.After(unifiedFeed[j].CreatedAt)
	})

	// Limit results
	if int64(len(unifiedFeed)) > limit {
		unifiedFeed = unifiedFeed[:limit]
	}

	// Convert to PostResponse format for compatibility
	postResponses := make([]contentDTO.PostResponse, 0, len(unifiedFeed))
	for _, feedPost := range unifiedFeed {
		// Parse ID if it's a local post
		var postID primitive.ObjectID
		if !feedPost.IsRemote {
			postID, _ = primitive.ObjectIDFromHex(feedPost.ID)
		}

		// Format author with instance indicator
		authorDisplay := feedPost.Author
		if feedPost.IsRemote {
			authorDisplay = fmt.Sprintf("%s@%s", feedPost.Author, feedPost.OriginInstance)
		}

		postResponses = append(postResponses, contentDTO.PostResponse{
			ID:           postID,
			AuthorName:   authorDisplay,
			AuthorAvatar: feedPost.AuthorAvatar,
			Content:      feedPost.Content,
			LikeCount:    feedPost.LikeCount,
			CommentCount: feedPost.CommentCount,
			IsLiked:      feedPost.IsLiked,
			IsSaved:      feedPost.IsSaved,
			CreatedAt:    feedPost.CreatedAt,
			UpdatedAt:    feedPost.CreatedAt,
		})
	}

	log.Printf("Returning %d federated posts", len(postResponses))

	return &contentDTO.FeedResponse{
		Posts: postResponses,
		Total: len(postResponses),
	}, nil
}

// getLocalFeedOnly returns only local posts (fallback when federation is disabled)
func (s *FederatedFeedService) getLocalFeedOnly(ctx context.Context, userID primitive.ObjectID, limit int64) (*contentDTO.FeedResponse, error) {
	localPosts, err := s.postRepo.GetAllPosts(ctx, []primitive.ObjectID{}, limit)
	if err != nil {
		return nil, err
	}

	postResponses := make([]contentDTO.PostResponse, 0, len(localPosts))
	for _, post := range localPosts {
		author, _ := s.userRepo.FindByID(ctx, post.AuthorID)
		authorName := "unknown"
		authorAvatar := ""
		if author != nil {
			authorName = author.Username
			authorAvatar = author.AvatarURL
		}

		isLiked, _ := s.postRepo.CheckIfLiked(ctx, post.ID, userID)
		isSaved, _ := s.postRepo.CheckIfSaved(ctx, post.ID, userID)

		postResponses = append(postResponses, contentDTO.PostResponse{
			ID:           post.ID,
			AuthorName:   authorName,
			AuthorAvatar: authorAvatar,
			Content:      post.Content,
			LikeCount:    post.LikeCount,
			CommentCount: post.CommentCount,
			IsLiked:      isLiked,
			IsSaved:      isSaved,
			CreatedAt:    post.CreatedAt,
			UpdatedAt:    post.UpdatedAt,
		})
	}

	return &contentDTO.FeedResponse{
		Posts: postResponses,
		Total: len(postResponses),
	}, nil
}
