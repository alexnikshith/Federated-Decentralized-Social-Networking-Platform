package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/reports/models"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestGetInteractionReport(t *testing.T) {
	userID := primitive.NewObjectID()

	tests := []struct {
		name             string
		userID           string
		mockRepoSetup    func(*MockReportRepository)
		expectedLikes    int
		expectedComments int
		expectedError    string
	}{
		{
			name:   "Success - Aggregates Interactions",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetInteractionsReceivedFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyInteraction, error) {
					return []models.DailyInteraction{
						{Likes: 10, Comments: 2},
						{Likes: 5, Comments: 1},
					}, nil
				}
			},
			expectedLikes:    15,
			expectedComments: 3,
		},
		{
			name:   "Error - Repo Failure",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetInteractionsReceivedFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyInteraction, error) {
					return nil, errors.New("db error")
				}
			},
			expectedError: "db error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReportRepository{}
			tt.mockRepoSetup(mockRepo)
			service := NewReportService(mockRepo)

			report, err := service.GetInteractionReport(context.Background(), tt.userID, "", "")

			if tt.expectedError != "" {
				if err == nil || err.Error() != tt.expectedError {
					t.Errorf("Expected error '%s', got '%v'", tt.expectedError, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if report.TotalLikes != tt.expectedLikes {
				t.Errorf("Expected %d likes, got %d", tt.expectedLikes, report.TotalLikes)
			}
			if report.TotalComments != tt.expectedComments {
				t.Errorf("Expected %d comments, got %d", tt.expectedComments, report.TotalComments)
			}
		})
	}
}

func TestGetInteractionMadeReport(t *testing.T) {
	userID := primitive.NewObjectID()

	tests := []struct {
		name             string
		userID           string
		mockRepoSetup    func(*MockReportRepository)
		expectedLikes    int
		expectedComments int
		expectedError    string
	}{
		{
			name:   "Success - Aggregates Interactions Made",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetInteractionsMadeFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyInteraction, error) {
					return []models.DailyInteraction{
						{Likes: 5, Comments: 5},
					}, nil
				}
			},
			expectedLikes:    5,
			expectedComments: 5,
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

			if report.TotalLikes != tt.expectedLikes {
				t.Errorf("Expected %d likes, got %d", tt.expectedLikes, report.TotalLikes)
			}
		})
	}
}
