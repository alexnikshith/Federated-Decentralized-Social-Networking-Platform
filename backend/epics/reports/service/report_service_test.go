package service

import (
	"context"
	"errors"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestResolveReport(t *testing.T) {
	reportID := primitive.NewObjectID()

	tests := []struct {
		name        string
		reportID    string
		mockRepo    func(*MockReportRepository)
		expectError bool
	}{
		{
			name:     "Success",
			reportID: reportID.Hex(),
			mockRepo: func(m *MockReportRepository) {
				m.ResolveReportFunc = func(ctx context.Context, id primitive.ObjectID) error {
					if id != reportID {
						return errors.New("ID mismatch")
					}
					return nil
				}
			},
			expectError: false,
		},
		{
			name:        "Invalid ID",
			reportID:    "invalid-hex",
			mockRepo:    func(m *MockReportRepository) {},
			expectError: true,
		},
		{
			name:     "Repo Error",
			reportID: reportID.Hex(),
			mockRepo: func(m *MockReportRepository) {
				m.ResolveReportFunc = func(ctx context.Context, id primitive.ObjectID) error {
					return errors.New("db error")
				}
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReportRepository{}
			tt.mockRepo(mockRepo)
			s := NewReportService(mockRepo)

			err := s.ResolveReport(context.Background(), tt.reportID)

			if (err != nil) != tt.expectError {
				t.Errorf("Expected error: %v, got: %v", tt.expectError, err)
			}
		})
	}
}
