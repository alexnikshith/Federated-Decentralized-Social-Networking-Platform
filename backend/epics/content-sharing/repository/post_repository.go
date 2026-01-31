package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/content-sharing/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PostRepository struct {
	posts    *mongo.Collection
	likes    *mongo.Collection
	comments *mongo.Collection
}

func NewPostRepository() *PostRepository {
	return &PostRepository{
		posts:    database.GetCollection("posts"),
		likes:    database.GetCollection("likes"),
		comments: database.GetCollection("comments"),
	}
}

// CreateIndexes creates necessary indexes for posts, likes, and comments
func (r *PostRepository) CreateIndexes(ctx context.Context) error {
	// Index for posts by author and timestamp
	postsIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "author_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
		},
		{
			Keys: bson.D{{Key: "created_at", Value: -1}},
		},
	}
	if _, err := r.posts.Indexes().CreateMany(ctx, postsIndexes); err != nil {
		return err
	}

	// Index for likes
	likesIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "post_id", Value: 1},
				{Key: "user_id", Value: 1},
			},
			Options: options.Index().SetUnique(true), // Prevent duplicate likes
		},
		{
			Keys: bson.D{{Key: "post_id", Value: 1}},
		},
	}
	if _, err := r.likes.Indexes().CreateMany(ctx, likesIndexes); err != nil {
		return err
	}

	// Index for comments
	commentsIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "post_id", Value: 1},
				{Key: "created_at", Value: 1},
			},
		},
	}
	if _, err := r.comments.Indexes().CreateMany(ctx, commentsIndexes); err != nil {
		return err
	}

	return nil
}

// CreatePost creates a new post
func (r *PostRepository) CreatePost(ctx context.Context, post *models.Post) error {
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()
	post.LikeCount = 0
	post.CommentCount = 0

	result, err := r.posts.InsertOne(ctx, post)
	if err != nil {
		return err
	}

	post.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetPostByID retrieves a post by ID
func (r *PostRepository) GetPostByID(ctx context.Context, postID primitive.ObjectID) (*models.Post, error) {
	var post models.Post
	err := r.posts.FindOne(ctx, bson.M{"_id": postID}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// GetFeed retrieves posts from users that the given user follows, sorted by timestamp
func (r *PostRepository) GetFeed(ctx context.Context, followingIDs []primitive.ObjectID, limit int64) ([]models.Post, error) {
	filter := bson.M{"author_id": bson.M{"$in": followingIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.posts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	return posts, nil
}

// GetPostsByAuthor retrieves posts by a specific author
func (r *PostRepository) GetPostsByAuthor(ctx context.Context, authorID primitive.ObjectID, limit int64) ([]models.Post, error) {
	filter := bson.M{"author_id": authorID}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.posts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	return posts, nil
}

// GetAllPosts retrieves all posts sorted by timestamp (newest first)
func (r *PostRepository) GetAllPosts(ctx context.Context, limit int64) ([]models.Post, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.posts.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	return posts, nil
}

// GetPostsByAuthors retrieves posts from specific authors sorted by timestamp (newest first)
func (r *PostRepository) GetPostsByAuthors(ctx context.Context, authorIDs []primitive.ObjectID, limit int64) ([]models.Post, error) {
	filter := bson.M{"author_id": bson.M{"$in": authorIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.posts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	return posts, nil
}

// GetPostsExcludingAuthors retrieves posts excluding specific authors sorted by timestamp (newest first)
func (r *PostRepository) GetPostsExcludingAuthors(ctx context.Context, excludeIDs []primitive.ObjectID, limit int64) ([]models.Post, error) {
	filter := bson.M{"author_id": bson.M{"$nin": excludeIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.posts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	return posts, nil
}

// DeletePost deletes a post by ID
func (r *PostRepository) DeletePost(ctx context.Context, postID primitive.ObjectID) error {
	_, err := r.posts.DeleteOne(ctx, bson.M{"_id": postID})
	return err
}

// CreateLike creates a like on a post
func (r *PostRepository) CreateLike(ctx context.Context, like *models.Like) error {
	like.CreatedAt = time.Now()

	_, err := r.likes.InsertOne(ctx, like)
	if err != nil {
		return err
	}

	// Increment like count on post
	_, err = r.posts.UpdateOne(
		ctx,
		bson.M{"_id": like.PostID},
		bson.M{"$inc": bson.M{"like_count": 1}},
	)

	return err
}

// DeleteLike removes a like from a post
func (r *PostRepository) DeleteLike(ctx context.Context, postID, userID primitive.ObjectID) error {
	result, err := r.likes.DeleteOne(ctx, bson.M{
		"post_id": postID,
		"user_id": userID,
	})
	if err != nil {
		return err
	}

	if result.DeletedCount > 0 {
		// Decrement like count on post
		_, err = r.posts.UpdateOne(
			ctx,
			bson.M{"_id": postID},
			bson.M{"$inc": bson.M{"like_count": -1}},
		)
	}

	return err
}

// CheckIfLiked checks if a user has liked a post
func (r *PostRepository) CheckIfLiked(ctx context.Context, postID, userID primitive.ObjectID) (bool, error) {
	count, err := r.likes.CountDocuments(ctx, bson.M{
		"post_id": postID,
		"user_id": userID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CreateComment creates a comment on a post
func (r *PostRepository) CreateComment(ctx context.Context, comment *models.Comment) error {
	comment.CreatedAt = time.Now()

	result, err := r.comments.InsertOne(ctx, comment)
	if err != nil {
		return err
	}

	comment.ID = result.InsertedID.(primitive.ObjectID)

	// Increment comment count on post
	_, err = r.posts.UpdateOne(
		ctx,
		bson.M{"_id": comment.PostID},
		bson.M{"$inc": bson.M{"comment_count": 1}},
	)

	return err
}

// GetCommentsByPostID retrieves all comments for a post
func (r *PostRepository) GetCommentsByPostID(ctx context.Context, postID primitive.ObjectID) ([]models.Comment, error) {
	filter := bson.M{"post_id": postID}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})

	cursor, err := r.comments.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var comments []models.Comment
	if err = cursor.All(ctx, &comments); err != nil {
		return nil, err
	}

	return comments, nil
}

// GetLikedPostsByUser retrieves posts liked by a user
func (r *PostRepository) GetLikedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error) {
	// 1. Find all likes by user
	cursor, err := r.likes.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var likes []models.Like
	if err = cursor.All(ctx, &likes); err != nil {
		return nil, err
	}

	if len(likes) == 0 {
		return []models.Post{}, nil
	}

	// 2. Extract post IDs
	var postIDs []primitive.ObjectID
	for _, like := range likes {
		postIDs = append(postIDs, like.PostID)
	}

	// 3. Find posts
	filter := bson.M{"_id": bson.M{"$in": postIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	postsCursor, err := r.posts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer postsCursor.Close(ctx)

	var posts []models.Post
	if err = postsCursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	return posts, nil
}

// GetCommentedPostsByUser retrieves posts commented on by a user
func (r *PostRepository) GetCommentedPostsByUser(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Post, error) {
	// 1. Find distinct post IDs from comments by user
	// We can use Distinct here for efficiency
	postIDsInterface, err := r.comments.Distinct(ctx, "post_id", bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}

	if len(postIDsInterface) == 0 {
		return []models.Post{}, nil
	}

	var postIDs []primitive.ObjectID
	for _, id := range postIDsInterface {
		if oid, ok := id.(primitive.ObjectID); ok {
			postIDs = append(postIDs, oid)
		}
	}

	// 2. Find posts
	filter := bson.M{"_id": bson.M{"$in": postIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.posts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, err
	}

	return posts, nil
}

// DeletePostsByAuthor deletes all posts by a specific author
func (r *PostRepository) DeletePostsByAuthor(ctx context.Context, authorID primitive.ObjectID) error {
	_, err := r.posts.DeleteMany(ctx, bson.M{"author_id": authorID})
	return err
}

// DeleteLikesByUser deletes all likes by a specific user
func (r *PostRepository) DeleteLikesByUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.likes.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

// DeleteCommentsByUser deletes all comments by a specific user
func (r *PostRepository) DeleteCommentsByUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.comments.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

// CountPostsByAuthor returns the number of posts by a specific user
func (r *PostRepository) CountPostsByAuthor(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return r.posts.CountDocuments(ctx, bson.M{"author_id": userID})
}
