package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DailyActivity struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Date      time.Time          `bson:"date" json:"date"`
	Minutes   int                `bson:"minutes" json:"minutes"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

type ActivityReport struct {
	TotalHours float64         `json:"total_hours"`
	DailyStats []DailyActivity `json:"daily_stats"`
}

type DailyInteraction struct {
	Date     time.Time `bson:"date" json:"date"`
	Likes    int       `bson:"likes" json:"likes"`
	Comments int       `bson:"comments" json:"comments"`
	Follows  int       `bson:"follows" json:"follows"`
}

type InteractionReport struct {
	TotalLikes    int                `json:"total_likes"`
	TotalComments int                `json:"total_comments"`
	TotalFollows  int                `json:"total_follows"`
	DailyStats    []DailyInteraction `json:"daily_stats"`
}
