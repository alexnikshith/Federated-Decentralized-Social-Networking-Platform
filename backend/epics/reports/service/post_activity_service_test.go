package service

import (
	"context"
	"federated-social/backend/epics/reports/models"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestGetPostActivityReport(t *testing.T) {
	userID := primitive.NewObjectID()

	tests := []struct {
		name          string
		userID        string
		mockRepoSetup func(*MockReportRepository)
		expectedPosts int
		expectedError string
	}{
		{
			name:   "Success - Count Posts",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetInteractionsMadeFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyInteraction, error) {
					return []models.DailyInteraction{
						{Posts: 5},
						{Posts: 3},
					}, nil
				}
			},
			expectedPosts: 8,
		},
		{
			name:   "Success - No Posts",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetInteractionsMadeFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyInteraction, error) {
					return []models.DailyInteraction{}, nil
				}
			},
			expectedPosts: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReportRepository{}
			tt.mockRepoSetup(mockRepo)
			service := NewReportService(mockRepo)

			report, err := service.GetInteractionMadeReport(context.Background(), tt.userID, "", "")

			if tt.expectedError != "" {
				if err == nil || err.Error() != tt.expectedError {
					t.Errorf("Expected error '%s', got '%v'", tt.expectedError, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if report.TotalPosts != tt.expectedPosts {
				t.Errorf("Expected %d posts, got %d", tt.expectedPosts, report.TotalPosts)
			}
		})
	}
}
