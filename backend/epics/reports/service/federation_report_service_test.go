package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/reports/models"
	"testing"
	"time"
)

func TestGetFederationReport(t *testing.T) {
	tests := []struct {
		name             string
		mockRepoSetup    func(*MockReportRepository)
		expectedInbound  int
		expectedOutbound int
		expectedError    string
	}{
		{
			name: "Success - Federation Stats",
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetFederationStatsFunc = func(ctx context.Context, start, end time.Time) (*models.FederationStats, error) {
					return &models.FederationStats{
						InboundCount:  100,
						OutboundCount: 50,
						Servers:       []string{"server1.com", "server2.com"},
					}, nil
				}
			},
			expectedInbound:  100,
			expectedOutbound: 50,
		},
		{
			name: "Error - Repo Failure",
			mockRepoSetup: func(m *MockReportRepository) {
				m.GetFederationStatsFunc = func(ctx context.Context, start, end time.Time) (*models.FederationStats, error) {
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

			report, err := service.GetFederationReports(context.Background(), "", "")

			if tt.expectedError != "" {
				if err == nil || err.Error() != tt.expectedError {
					t.Errorf("Expected error '%s', got '%v'", tt.expectedError, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if report.InboundCount != tt.expectedInbound {
				t.Errorf("Expected %d inbound, got %d", tt.expectedInbound, report.InboundCount)
			}
			if report.OutboundCount != tt.expectedOutbound {
				t.Errorf("Expected %d outbound, got %d", tt.expectedOutbound, report.OutboundCount)
			}
		})
	}
}
