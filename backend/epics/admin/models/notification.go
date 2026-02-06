package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AdminNotificationType string

const (
	NotificationReviewAlert  AdminNotificationType = "review_alert"
	NotificationAutoDisabled AdminNotificationType = "auto_disabled"
)

// AdminNotification represents a notification for the admin dashboard
type AdminNotification struct {
	ID           primitive.ObjectID    `json:"id" bson:"_id,omitempty"`
	Type         AdminNotificationType `json:"type" bson:"type"`
	TargetUserID primitive.ObjectID    `json:"target_user_id" bson:"target_user_id"`
	ReportCount  int                   `json:"report_count" bson:"report_count"`
	Message      string                `json:"message" bson:"message"`
	CreatedAt    time.Time             `json:"created_at" bson:"created_at"`
	IsRead       bool                  `json:"is_read" bson:"is_read"`
	IsResolved   bool                  `json:"is_resolved" bson:"is_resolved"`
}
