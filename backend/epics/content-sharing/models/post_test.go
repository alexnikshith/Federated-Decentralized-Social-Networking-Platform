package models

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestPostModel(t *testing.T) {
	tests := []struct {
		name    string
		post    Post
		wantErr bool
	}{
		{
			name: "Valid post creation",
			post: Post{
				ID:           primitive.NewObjectID(),
				AuthorID:     primitive.NewObjectID(),
				Content:      "This is a test post",
				LikeCount:    0,
				CommentCount: 0,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			},
			wantErr: false,
		},
		{
			name: "Post with likes and comments",
			post: Post{
				ID:           primitive.NewObjectID(),
				AuthorID:     primitive.NewObjectID(),
				Content:      "Popular post",
				LikeCount:    5,
				CommentCount: 3,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.post.ID.IsZero() {
				t.Errorf("Post ID should not be zero")
			}
			if tt.post.AuthorID.IsZero() {
				t.Errorf("Post AuthorID should not be zero")
			}
		})
	}
}

func TestFollowModel(t *testing.T) {
	tests := []struct {
		name    string
		follow  Follow
		wantErr bool
	}{
		{
			name: "Valid follow relationship",
			follow: Follow{
				ID:          primitive.NewObjectID(),
				FollowerID:  primitive.NewObjectID(),
				FollowingID: primitive.NewObjectID(),
				CreatedAt:   time.Now(),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.follow.FollowerID.IsZero() || tt.follow.FollowingID.IsZero() {
				t.Errorf("FollowerID and FollowingID should not be zero")
			}
		})
	}
}
