package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VerificationCode represents an OTP code for 2FA/verification
type VerificationCode struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	Code      string             `json:"code" bson:"code"`
	ExpiresAt time.Time          `json:"expires_at" bson:"expires_at"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}
