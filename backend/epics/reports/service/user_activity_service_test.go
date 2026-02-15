package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/reports/models"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestGetUserActivityReport(t *testing.T) {
	userID := primitive.NewObjectID()
	now := time.Now().UTC()

	tests := []struct {
		name          string
		userID        string
		startDate     string
		endDate       string
		mockRepoSetup func(*MockReportRepository)
		expectedHours float64
		expectedError string
	}{
		{
			name:   "Success - Valid Date Range",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetActivityFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyActivity, error) {
					return []models.DailyActivity{
						{Minutes: 60, Date: now.AddDate(0, 0, -1)},
						{Minutes: 30, Date: now},
					}, nil
				}
			},
			expectedHours: 1.5,
		},
		{
			name:   "Success - Empty Activity",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetActivityFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyActivity, error) {
					return []models.DailyActivity{}, nil
				}
			},
			expectedHours: 0,
		},
		{
			name:   "Error - Invalid User ID",
			userID: "invalid-id",
			mockRepoSetup: func(m *MockReportRepository) {
			},
			expectedError: "invalid user ID",
		},
		{
			name:   "Error - Repo Failure",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetActivityFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyActivity, error) {
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

			report, err := service.GetUserActivityReport(context.Background(), tt.userID, tt.startDate, tt.endDate)

			if tt.expectedError != "" {
				if err == nil || err.Error() != tt.expectedError {
					t.Errorf("Expected error '%s', got '%v'", tt.expectedError, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if report.TotalHours != tt.expectedHours {
				t.Errorf("Expected %.2f hours, got %.2f", tt.expectedHours, report.TotalHours)
			}
		})
	}
}

func TestRecordActivity(t *testing.T) {
	userID := primitive.NewObjectID()

	tests := []struct {
		name          string
		userID        string
		mockRepoSetup func(*MockReportRepository)
		expectedError string
	}{
		{
			name:   "Success",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.IncrementActivityFunc = func(ctx context.Context, uid primitive.ObjectID, date time.Time) error {
					if uid != userID {
						return errors.New("wrong user ID")
					}
					return nil
				}
			},
		},
		{
			name:   "Error - Invalid ID",
			userID: "invalid",
			mockRepoSetup: func(m *MockReportRepository) {
			},
			expectedError: "invalid user ID",
		},
		{
			name:   "Error - Repo Failure",
			userID: userID.Hex(),
			mockRepoSetup: func(m *MockReportRepository) {
				m.IncrementActivityFunc = func(ctx context.Context, uid primitive.ObjectID, date time.Time) error {
					return errors.New("db error")
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

			err := service.RecordActivity(context.Background(), tt.userID)

			if tt.expectedError != "" {
				if err == nil || err.Error() != tt.expectedError {
					t.Errorf("Expected error '%s', got '%v'", tt.expectedError, err)
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}
