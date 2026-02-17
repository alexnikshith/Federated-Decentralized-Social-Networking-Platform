package service_test

import (
	"context"
	reportModels "federated-social/backend/epics/reports/models"
	"federated-social/backend/epics/reports/service"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// US4.2: Report Content (User Report)
func TestReport_SubmitUserReport(t *testing.T) {
	mockRepo := &MockReportRepository{}
	svc := service.NewReportService(mockRepo)

	reporterID := primitive.NewObjectID()
	reportedID := primitive.NewObjectID()

	req := service.SubmitReportRequest{
		ReportedID:  reportedID.Hex(),
		Reason:      "Harassment",
		Description: "Abusive comments",
	}

	var capturedReport reportModels.UserReport
	mockRepo.CreateUserReportFunc = func(ctx context.Context, report reportModels.UserReport) error {
		capturedReport = report
		return nil
	}
	mockRepo.CountReportsFunc = func(ctx context.Context, id primitive.ObjectID) (int64, error) {
		return 1, nil
	}

	err := svc.SubmitUserReport(context.Background(), reporterID.Hex(), req)
	if err != nil {
		t.Fatalf("SubmitUserReport failed: %v", err)
	}

	if capturedReport.ReporterID != reporterID {
		t.Errorf("Expected reporterID %s, got %s", reporterID, capturedReport.ReporterID)
	}
	if capturedReport.ReportedID != reportedID {
		t.Errorf("Expected reportedID %s, got %s", reportedID, capturedReport.ReportedID)
	}
	if capturedReport.Reason != req.Reason {
		t.Errorf("Expected reason %s, got %s", req.Reason, capturedReport.Reason)
	}
	if capturedReport.Status != "pending" {
		t.Errorf("Expected status pending, got %s", capturedReport.Status)
	}
}

func TestReport_SubmitReport_SelfReport_Fail(t *testing.T) {
	mockRepo := &MockReportRepository{}
	svc := service.NewReportService(mockRepo)

	userID := primitive.NewObjectID()
	req := service.SubmitReportRequest{
		ReportedID:  userID.Hex(),
		Reason:      "Self",
		Description: "Self",
	}

	err := svc.SubmitUserReport(context.Background(), userID.Hex(), req)
	if err == nil {
		t.Error("Expected error when reporting self, got nil")
	}
}
