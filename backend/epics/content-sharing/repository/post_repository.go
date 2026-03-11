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
	posts        *mongo.Collection
	likes        *mongo.Collection
	comments     *mongo.Collection
	savedPosts   *mongo.Collection
	reports      *mongo.Collection
	interactions *mongo.Collection
}

func NewPostRepository() *PostRepository {
	return &PostRepository{
		posts:        database.GetCollection("posts"),
		likes:        database.GetCollection("likes"),
		comments:     database.GetCollection("comments"),
		savedPosts:   database.GetCollection("saved_posts"),
		reports:      database.GetCollection("reports"),
		interactions: database.GetCollection("post_interactions"),
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
		{
			Keys: bson.D{{Key: "user_id", Value: 1}},
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
		{
			Keys: bson.D{{Key: "user_id", Value: 1}},
		},
	}
	if _, err := r.comments.Indexes().CreateMany(ctx, commentsIndexes); err != nil {
		return err
	}

	// Index for saved posts
	savedIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "post_id", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
	}
	if _, err := r.savedPosts.Indexes().CreateMany(ctx, savedIndexes); err != nil {
		return err
	}

	// Index for interactions
	interactionIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "post_id", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
	}
	if _, err := r.interactions.Indexes().CreateMany(ctx, interactionIndexes); err != nil {
		return err
	}

	// Index for reports
	// First, drop the incorrect index if it exists (legacy/buggy index)
	_, _ = r.reports.Indexes().DropOne(ctx, "reporter_id_1_reported_id_1")

	reportIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "reporter_id", Value: 1},
				{Key: "post_id", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "created_at", Value: -1}},
		},
	}
	if _, err := r.reports.Indexes().CreateMany(ctx, reportIndexes); err != nil {
		return err
	}

	return nil
}

// CreatePost creates a new post in the database
// It initializes timestamps and counters (likes, comments) to zero.
func (r *PostRepository) CreatePost(ctx context.Context, post *models.Post) error {
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()
	post.LikeCount = 0
	post.CommentCount = 0
	post.Status = "active"

	result, err := r.posts.InsertOne(ctx, post)
	if err != nil {
		return err
	}

	post.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// UpdatePost updates an existing post
func (r *PostRepository) UpdatePost(ctx context.Context, post *models.Post) error {
	post.UpdatedAt = time.Now()
	_, err := r.posts.ReplaceOne(ctx, bson.M{"_id": post.ID}, post)
	return err
}

// UpdatePostMentions updates only the mentioned usernames of a post
func (r *PostRepository) UpdatePostMentions(ctx context.Context, postID primitive.ObjectID, usernames []string) error {
	_, err := r.posts.UpdateOne(
		ctx,
		bson.M{"_id": postID},
		bson.M{"$set": bson.M{"mentioned_usernames": usernames}},
	)
	return err
}

// GetPostByID retrieves a single post by its unique ID
func (r *PostRepository) GetPostByID(ctx context.Context, postID primitive.ObjectID) (*models.Post, error) {
	// We must fetch even 'under_review' posts for admin dashboard,
	// but this method is generally used for displaying content.
	// Since PostService.GetAllReports fetches post details, we DO need a way to fetch raw posts even if hidden.
	// So I will add a new method GetPostByIDUnfiltered and restore the old GetPostByID for safety?
	// ACTUALLY: The Service calls GetPostByID in GetAllReports where it needs to see the post content.
	// If I filter here, the Admin Dashboard will show "Post not found" or empty content.
	// Conflict: Admin needs to see it, User shouldn't.
	// Solution: I'll revert strict filtering in Service?
	// Or even better: Add a specific GetRawPostByID for admin/internal use.
	// But `GetAllReports` calls `GetPostByID`.
	// Let's modify GetAllReports to use the raw collection or a new method.
	// For now, to solve "remove from feed", filtering the list endpoints (GetFeed, GetPostsByAuthor) is key.
	// Direct access via ID might be less critical or handled by frontend state.
	// But `GetPostByID` is also used for the post detail page.
	// I will keep the filter here (so users can't see it), and add `GetPostByIDAdmin` for `GetAllReports`.

	var post models.Post
	filter := bson.M{
		"_id": postID,
		"$or": []bson.M{
			{"status": "active"},
			{"status": bson.M{"$exists": false}},
		},
	}
	err := r.posts.FindOne(ctx, filter).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// GetPostByIDAdmin retrieves any post by ID regardless of status (for admin usage)
func (r *PostRepository) GetPostByIDAdmin(ctx context.Context, postID primitive.ObjectID) (*models.Post, error) {
	var post models.Post
	err := r.posts.FindOne(ctx, bson.M{"_id": postID}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// GetFeed retrieves posts from users that the given user follows, sorted by timestamp
func (r *PostRepository) GetFeed(ctx context.Context, followingIDs []primitive.ObjectID, limit int64) ([]models.Post, error) {
	filter := bson.M{
		"author_id": bson.M{"$in": followingIDs},
		"$or": []bson.M{
			{"status": "active"},
			{"status": bson.M{"$exists": false}},
		},
	}
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
	filter := bson.M{
		"author_id": authorID,
		"$or": []bson.M{
			{"status": "active"},
			{"status": bson.M{"$exists": false}},
		},
	}
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
// GetAllPosts retrieves all posts sorted by timestamp (newest first), excluding specific authors
func (r *PostRepository) GetAllPosts(ctx context.Context, excludeIDs []primitive.ObjectID, limit int64) ([]models.Post, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"status": "active"},
			{"status": bson.M{"$exists": false}},
		},
	}
	if len(excludeIDs) > 0 {
		filter["author_id"] = bson.M{"$nin": excludeIDs}
	}

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

// GetPostsByAuthors retrieves posts from specific authors sorted by timestamp (newest first)
func (r *PostRepository) GetPostsByAuthors(ctx context.Context, authorIDs []primitive.ObjectID, limit int64) ([]models.Post, error) {
	filter := bson.M{
		"author_id": bson.M{"$in": authorIDs},
		"$or": []bson.M{
			{"status": "active"},
			{"status": bson.M{"$exists": false}},
		},
	}
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
	filter := bson.M{
		"author_id": bson.M{"$nin": excludeIDs},
		"$or": []bson.M{
			{"status": "active"},
			{"status": bson.M{"$exists": false}},
		},
	}
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

// GetLikesByPostID retrieves all likes for a post
func (r *PostRepository) GetLikesByPostID(ctx context.Context, postID primitive.ObjectID) ([]models.Like, error) {
	filter := bson.M{"post_id": postID}
	cursor, err := r.likes.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var likes []models.Like
	if err = cursor.All(ctx, &likes); err != nil {
		return nil, err
	}
	return likes, nil
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

// GetCommentByID retrieves a single comment by ID
func (r *PostRepository) GetCommentByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error) {
	var comment models.Comment
	err := r.comments.FindOne(ctx, bson.M{"_id": id}).Decode(&comment)
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

// DeleteComment deletes a comment and decrements post comment count
func (r *PostRepository) DeleteComment(ctx context.Context, commentID primitive.ObjectID) error {
	var comment models.Comment
	err := r.comments.FindOne(ctx, bson.M{"_id": commentID}).Decode(&comment)
	if err != nil {
		return err
	}

	_, err = r.comments.DeleteOne(ctx, bson.M{"_id": commentID})
	if err != nil {
		return err
	}

	_, _ = r.posts.UpdateOne(ctx, bson.M{"_id": comment.PostID}, bson.M{"$inc": bson.M{"comment_count": -1}})
	return nil
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

// DeleteSavedPostsByUser removes all saved-post bookmarks belonging to a user
func (r *PostRepository) DeleteSavedPostsByUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.savedPosts.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

// DeleteReportsByUser removes all reports submitted by a user
func (r *PostRepository) DeleteReportsByUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.reports.DeleteMany(ctx, bson.M{"reporter_id": userID})
	return err
}

// DeleteInteractionsByUser removes all post interaction records (interested/not_interested) by a user
func (r *PostRepository) DeleteInteractionsByUser(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.interactions.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

// CountPostsByAuthor returns the number of active posts by a specific user
func (r *PostRepository) CountPostsByAuthor(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	filter := bson.M{
		"author_id": userID,
		"$or": []bson.M{
			{"status": "active"},
			{"status": bson.M{"$exists": false}},
		},
	}
	return r.posts.CountDocuments(ctx, filter)
}

// CountAll returns the total number of posts
func (r *PostRepository) CountAll(ctx context.Context) (int64, error) {
	return r.posts.CountDocuments(ctx, bson.M{})
}

// FindAll returns all posts
func (r *PostRepository) FindAll(ctx context.Context) ([]models.Post, error) {
	cursor, err := r.posts.Find(ctx, bson.M{})
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

// SavePost saves a post for a user
func (r *PostRepository) SavePost(ctx context.Context, savedPost *models.SavedPost) error {
	savedPost.CreatedAt = time.Now()
	_, err := r.savedPosts.InsertOne(ctx, savedPost)
	return err
}

// UnsavePost removes a saved post for a user
func (r *PostRepository) UnsavePost(ctx context.Context, userID, postID primitive.ObjectID) error {
	_, err := r.savedPosts.DeleteOne(ctx, bson.M{"user_id": userID, "post_id": postID})
	return err
}

// GetSavedPostIDsByUser retrieves IDs of posts saved by a user
func (r *PostRepository) GetSavedPostIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	cursor, err := r.savedPosts.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var saved []models.SavedPost
	if err = cursor.All(ctx, &saved); err != nil {
		return nil, err
	}

	ids := make([]primitive.ObjectID, len(saved))
	for i, s := range saved {
		ids[i] = s.PostID
	}
	return ids, nil
}

// CheckIfSaved checks if a user has saved a post
func (r *PostRepository) CheckIfSaved(ctx context.Context, postID, userID primitive.ObjectID) (bool, error) {
	count, err := r.savedPosts.CountDocuments(ctx, bson.M{"post_id": postID, "user_id": userID})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CheckIfReported checks if a user has already reported a post
func (r *PostRepository) CheckIfReported(ctx context.Context, postID, userID primitive.ObjectID) (bool, error) {
	count, err := r.reports.CountDocuments(ctx, bson.M{
		"post_id":     postID,
		"reporter_id": userID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CreateReport submits a report for a post
func (r *PostRepository) CreateReport(ctx context.Context, report *models.ReportedPost) error {
	report.CreatedAt = time.Now()
	report.Status = "pending"

	// Create the report
	if _, err := r.reports.InsertOne(ctx, report); err != nil {
		return err
	}

	// Determine status for the post (immediately put under review)
	_, err := r.posts.UpdateOne(ctx, bson.M{"_id": report.PostID}, bson.M{"$set": bson.M{"status": "under_review"}})
	return err
}

// GetAllReports retrieves all reports for admin review
func (r *PostRepository) GetAllReports(ctx context.Context) ([]models.ReportedPost, error) {
	cursor, err := r.reports.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []models.ReportedPost
	if err = cursor.All(ctx, &reports); err != nil {
		return nil, err
	}
	return reports, nil
}

// GetReportedPostIDsByUser retrieves IDs of posts reported by a user (to hide them)
func (r *PostRepository) GetReportedPostIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	cursor, err := r.reports.Find(ctx, bson.M{"reporter_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []models.ReportedPost
	if err = cursor.All(ctx, &reports); err != nil {
		return nil, err
	}

	ids := make([]primitive.ObjectID, len(reports))
	for i, rep := range reports {
		ids[i] = rep.PostID
	}
	return ids, nil
}

// DeleteReport deletes a report
func (r *PostRepository) DeleteReport(ctx context.Context, reportID primitive.ObjectID) error {
	_, err := r.reports.DeleteOne(ctx, bson.M{"_id": reportID})
	return err
}

// GetReportByID retrieves a single report by ID
func (r *PostRepository) GetReportByID(ctx context.Context, reportID primitive.ObjectID) (*models.ReportedPost, error) {
	var report models.ReportedPost
	err := r.reports.FindOne(ctx, bson.M{"_id": reportID}).Decode(&report)
	if err != nil {
		return nil, err
	}
	return &report, nil
}

// UpdatePostStatus updates the status of a post
func (r *PostRepository) UpdatePostStatus(ctx context.Context, postID primitive.ObjectID, status string) error {
	_, err := r.posts.UpdateOne(ctx, bson.M{"_id": postID}, bson.M{"$set": bson.M{"status": status}})
	return err
}

// UpsertInteraction tracks user interaction sentiment
func (r *PostRepository) UpsertInteraction(ctx context.Context, interaction *models.PostInteraction) error {
	filter := bson.M{"user_id": interaction.UserID, "post_id": interaction.PostID}
	update := bson.M{
		"$set": bson.M{
			"type":       interaction.Type,
			"created_at": time.Now(),
		},
	}
	opts := options.Update().SetUpsert(true)
	_, err := r.interactions.UpdateOne(ctx, filter, update, opts)
	return err
}

// GetHiddenPostIDsByUser retrieves IDs of posts marks as "not_interested"
func (r *PostRepository) GetHiddenPostIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	cursor, err := r.interactions.Find(ctx, bson.M{"user_id": userID, "type": "not_interested"})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var interactions []models.PostInteraction
	if err = cursor.All(ctx, &interactions); err != nil {
		return nil, err
	}

	ids := make([]primitive.ObjectID, len(interactions))
	for i, inter := range interactions {
		ids[i] = inter.PostID
	}
	return ids, nil
}

// GetInterestedAuthorIDsByUser retrieves IDs of authors whose posts the user liked or marked "interested"
func (r *PostRepository) GetInterestedAuthorIDsByUser(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	// 1. Get authors from "interested" interactions
	cursor, err := r.interactions.Find(ctx, bson.M{"user_id": userID, "type": "interested"})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var interactions []models.PostInteraction
	_ = cursor.All(ctx, &interactions)

	authorSet := make(map[primitive.ObjectID]bool)
	for _, inter := range interactions {
		post, err := r.GetPostByID(ctx, inter.PostID)
		if err == nil {
			authorSet[post.AuthorID] = true
		}
	}

	// 2. Get authors from likes
	cursor, err = r.likes.Find(ctx, bson.M{"user_id": userID})
	if err == nil {
		var likes []models.Like
		_ = cursor.All(ctx, &likes)
		for _, like := range likes {
			post, err := r.GetPostByID(ctx, like.PostID)
			if err == nil {
				authorSet[post.AuthorID] = true
			}
		}
		cursor.Close(ctx)
	}

	ids := make([]primitive.ObjectID, 0, len(authorSet))
	for id := range authorSet {
		ids = append(ids, id)
	}
	return ids, nil
}

// GetPostIDsByAuthors retrieves IDs of posts from specific authors
func (r *PostRepository) GetPostIDsByAuthors(ctx context.Context, authorIDs []primitive.ObjectID, limit int64) ([]primitive.ObjectID, error) {
	filter := bson.M{"author_id": bson.M{"$in": authorIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit).
		SetProjection(bson.M{"_id": 1})

	cursor, err := r.posts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	ids := make([]primitive.ObjectID, len(results))
	for i, res := range results {
		ids[i] = res.ID
	}
	return ids, nil
}
