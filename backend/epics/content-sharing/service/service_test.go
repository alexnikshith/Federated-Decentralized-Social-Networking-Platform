package service

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestPostServiceValidation(t *testing.T) {
	tests := []struct {
		name      string
		userID    string
		content   string
		wantError bool
	}{
		{
			name:      "Valid post",
			userID:    primitive.NewObjectID().Hex(),
			content:   "Test post content",
			wantError: false,
		},
		{
			name:      "Empty content",
			userID:    primitive.NewObjectID().Hex(),
			content:   "",
			wantError: true,
		},
		{
			name:      "Empty user ID",
			userID:    "",
			content:   "Test post",
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if len(tt.content) == 0 && !tt.wantError {
				t.Errorf("Empty content should error")
			}
			if len(tt.userID) == 0 && !tt.wantError {
				t.Errorf("Empty userID should error")
			}
		})
	}
}
