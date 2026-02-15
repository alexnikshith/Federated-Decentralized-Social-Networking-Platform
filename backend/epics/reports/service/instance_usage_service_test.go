package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/reports/models"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestSubmitUserReport(t *testing.T) {
	reporterID := primitive.NewObjectID()
	reportedID := primitive.NewObjectID()

	tests := []struct {
		name          string
		reporterID    string
		req           SubmitReportRequest
		mockRepoSetup func(*MockReportRepository)
		expectedError string
	}{
		{
			name:       "Success - Report Submitted",
			reporterID: reporterID.Hex(),
			req: SubmitReportRequest{
				ReportedID: reportedID.Hex(),
				Reason:     "Spam",
			},
			mockRepoSetup: func(m *MockReportRepository) {
				m.CreateUserReportFunc = func(ctx context.Context, report models.UserReport) error {
					return nil
				}
				m.CountReportsFunc = func(ctx context.Context, reportedID primitive.ObjectID) (int64, error) {
					return 1, nil
				}
			},
		},
		{
			name:       "Success - Auto Deactivate User",
			reporterID: reporterID.Hex(),
			req: SubmitReportRequest{
				ReportedID: reportedID.Hex(),
				Reason:     "Harassment",
			},
			mockRepoSetup: func(m *MockReportRepository) {
				m.CreateUserReportFunc = func(ctx context.Context, report models.UserReport) error {
					return nil
				}
				m.CountReportsFunc = func(ctx context.Context, reportedID primitive.ObjectID) (int64, error) {
					return 10, nil // > 8, should trigger deactivation
				}
				m.DeactivateUserFunc = func(ctx context.Context, uid primitive.ObjectID) error {
					if uid != reportedID {
						return errors.New("wrong user ID deactivated")
					}
					return nil
				}
			},
		},
		{
			name:       "Error - Self Reporting",
			reporterID: reporterID.Hex(),
			req: SubmitReportRequest{
				ReportedID: reporterID.Hex(), // Same as reporter
				Reason:     "Self",
			},
			mockRepoSetup: func(m *MockReportRepository) {
			},
			expectedError: "cannot report yourself",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReportRepository{}
			tt.mockRepoSetup(mockRepo)
			service := NewReportService(mockRepo)

			err := service.SubmitUserReport(context.Background(), tt.reporterID, tt.req)

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

func TestGetAdminReports(t *testing.T) {
	tests := []struct {
		name          string
		mockRepoSetup func(*MockReportRepository)
		expectedCount int
		expectedError string
	}{
		{
			name: "Success - Retrieve Reports",
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetReportsFunc = func(ctx context.Context) ([]models.UserReportResponse, error) {
					return []models.UserReportResponse{
						{}, {},
					}, nil
				}
			},
			expectedCount: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReportRepository{}
			tt.mockRepoSetup(mockRepo)
			service := NewReportService(mockRepo)

			reports, err := service.GetAdminReports(context.Background())

			if tt.expectedError != "" {
				if err == nil || err.Error() != tt.expectedError {
					t.Errorf("Expected error '%s', got '%v'", tt.expectedError, err)
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}

			if len(reports) != tt.expectedCount {
				t.Errorf("Expected %d reports, got %d", tt.expectedCount, len(reports))
			}
		})
	}
}
