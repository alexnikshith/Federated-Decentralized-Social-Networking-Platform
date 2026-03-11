package repository

import (
	"context"
	"federated-social/backend/epics/content-sharing/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PostRepositoryInterface interface {
	CountAll(ctx context.Context) (int64, error)
	DeletePost(ctx context.Context, id primitive.ObjectID) error
	DeletePostsByAuthor(ctx context.Context, authorID primitive.ObjectID) error
	DeleteLikesByUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteCommentsByUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteSavedPostsByUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteReportsByUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteInteractionsByUser(ctx context.Context, userID primitive.ObjectID) error
	GetReportByID(ctx context.Context, id primitive.ObjectID) (*models.ReportedPost, error)
	UpdatePostStatus(ctx context.Context, postID primitive.ObjectID, status string) error
	DeleteReport(ctx context.Context, id primitive.ObjectID) error
	CreateIndexes(ctx context.Context) error
}

type FollowRepositoryInterface interface {
	DeleteAllFollows(ctx context.Context, userID primitive.ObjectID) error
	CreateIndexes(ctx context.Context) error
}

type NotificationRepositoryInterface interface {
	DeleteUserNotifications(ctx context.Context, userID primitive.ObjectID) error
	CreateIndexes(ctx context.Context) error
}

type StoryRepositoryInterface interface {
	DeleteStoriesByAuthor(ctx context.Context, authorID primitive.ObjectID) error
	CreateIndexes(ctx context.Context) error
}

type SearchRepositoryInterface interface {
	CreateIndexes(ctx context.Context) error
}
