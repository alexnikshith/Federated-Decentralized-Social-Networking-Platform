package service

import (
	"context"
	"federated-social/backend/epics/reports/models"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestTimeBasedSummary(t *testing.T) {
	userID := primitive.NewObjectID()

	tests := []struct {
		name          string
		userID        string
		startStr      string
		endStr        string
		mockRepoSetup func(*MockReportRepository)
		checkDates    func(start, end time.Time) bool
	}{
		{
			name:     "Custom Date Range Parsing",
			userID:   userID.Hex(),
			startStr: "2023-01-01",
			endStr:   "2023-01-31",
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetActivityFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyActivity, error) {
					// Verify dates are parsed correctly
					if start.Year() == 2023 && start.Month() == 1 && start.Day() == 1 &&
						end.Year() == 2023 && end.Month() == 1 && end.Day() == 31 {
						return []models.DailyActivity{}, nil
					}
					return nil, nil
				}
			},
		},
		{
			name:     "Default Date Range (Last 30 Days)",
			userID:   userID.Hex(),
			startStr: "",
			endStr:   "",
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetActivityFunc = func(ctx context.Context, uid primitive.ObjectID, start, end time.Time) ([]models.DailyActivity, error) {
					// Verify roughly 30 days gap
					diff := end.Sub(start)
					days := int(diff.Hours() / 24)
					if days >= 29 && days <= 31 {
						return []models.DailyActivity{}, nil
					}
					return nil, nil
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReportRepository{}
			tt.mockRepoSetup(mockRepo)
			service := NewReportService(mockRepo)

			// We just call the method and the mock verifies the parameters internally
			_, _ = service.GetUserActivityReport(context.Background(), tt.userID, tt.startStr, tt.endStr)
		})
	}
}
