package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/models"
	"log"
	"math"
	"regexp"
	"sort"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Stop words to ignore during keyword extraction
var stopWords = map[string]bool{
	"a": true, "an": true, "the": true, "and": true, "or": true, "but": true, "if": true, "then": true,
	"is": true, "are": true, "was": true, "were": true, "be": true, "been": true, "being": true,
	"in": true, "on": true, "at": true, "to": true, "for": true, "with": true, "by": true, "about": true,
	"it": true, "this": true, "that": true, "these": true, "those": true, "i": true, "you": true,
	"he": true, "she": true, "we": true, "they": true, "my": true, "your": true, "his": true, "her": true,
}

type PostRepo interface {
	GetLikedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error)
	GetCommentedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error)
}

type RecommenderService struct {
	postRepo PostRepo
}

func NewRecommenderService(postRepo PostRepo) *RecommenderService {
	return &RecommenderService{
		postRepo: postRepo,
	}
}

// GetUserInterests builds a keyword-based interest profile for the user
func (s *RecommenderService) GetUserInterests(ctx context.Context, userID primitive.ObjectID) (map[string]float64, error) {
	interests := make(map[string]float64)

	// 1. Get posts liked by user
	likedPosts, err := s.postRepo.GetLikedPostsByUser(ctx, userID, 50)
	if err != nil {
		log.Printf("Error fetching liked posts for recommendations: %v", err)
	}

	for _, post := range likedPosts {
		keywords := s.extractKeywords(post.Content)
		for _, kw := range keywords {
			interests[kw] += 1.0 // Weight for a like
		}
	}

	// 2. Get posts commented on by user
	commentedPosts, err := s.postRepo.GetCommentedPostsByUser(ctx, userID, 20)
	if err != nil {
		log.Printf("Error fetching commented posts for recommendations: %v", err)
	}

	for _, post := range commentedPosts {
		keywords := s.extractKeywords(post.Content)
		for _, kw := range keywords {
			interests[kw] += 1.5 // Comments often show higher engagement than likes
		}
	}

	// 3. Normalize weights (optional but good for consistency)
	// We can cap it or just use raw scores. For simple ranking, raw is fine.

	return interests, nil
}

// ScorePost calculates a similarity score between a post and the user's interests
func (s *RecommenderService) ScorePost(post models.Post, interests map[string]float64) float64 {
	if len(interests) == 0 {
		return 0
	}

	keywords := s.extractKeywords(post.Content)
	score := 0.0

	for _, kw := range keywords {
		if weight, ok := interests[kw]; ok {
			score += weight
		}
	}

	// Bonus for recency (decay)
	// ageInHours := time.Since(post.CreatedAt).Hours()
	// score *= math.Pow(0.95, ageInHours) // 5% decay per hour

	return score
}

// PrioritizePosts sorts posts based on similarity to user interests
func (s *RecommenderService) PrioritizePosts(posts []models.Post, interests map[string]float64) []models.Post {
	if len(interests) == 0 {
		return posts
	}

	type scoredPost struct {
		post  models.Post
		score float64
	}

	scored := make([]scoredPost, len(posts))
	for i, p := range posts {
		scored[i] = scoredPost{
			post:  p,
			score: s.ScorePost(p, interests),
		}
	}

	// Sort by score desc, then by date desc
	sort.SliceStable(scored, func(i, j int) bool {
		if math.Abs(scored[i].score-scored[j].score) < 0.001 {
			return scored[i].post.CreatedAt.After(scored[j].post.CreatedAt)
		}
		return scored[i].score > scored[j].score
	})

	result := make([]models.Post, len(posts))
	for i, sp := range scored {
		result[i] = sp.post
	}

	return result
}

// extractKeywords cleans and splits content into meaningful keywords
func (s *RecommenderService) extractKeywords(content string) []string {
	content = strings.ToLower(content)

	// Remove URLs
	urlRegex := regexp.MustCompile(`https?://[^\s]+`)
	content = urlRegex.ReplaceAllString(content, "")

	// Remove punctuation and special characters, keep only alpha-numeric
	reg, _ := regexp.Compile("[^a-zA-Z0-9]+")
	content = reg.ReplaceAllString(content, " ")

	words := strings.Fields(content)
	var keywords []string

	for _, w := range words {
		if len(w) > 2 && !stopWords[w] {
			keywords = append(keywords, w)
		}
	}

	return keywords
}
