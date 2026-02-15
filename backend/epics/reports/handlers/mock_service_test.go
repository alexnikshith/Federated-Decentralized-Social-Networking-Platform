package handlers

import (
	"context"
	"federated-social/backend/epics/reports/models"
	"federated-social/backend/epics/reports/service"
)

type MockReportService struct {
	RecordActivityFunc           func(ctx context.Context, userID string) error
	GetUserActivityReportFunc    func(ctx context.Context, userID string, startStr, endStr string) (*models.ActivityReport, error)
	SubmitUserReportFunc         func(ctx context.Context, reporterID string, req service.SubmitReportRequest) error
	GetAdminReportsFunc          func(ctx context.Context) ([]models.UserReportResponse, error)
	GetFederationReportsFunc     func(ctx context.Context, startStr, endStr string) (*models.FederationStats, error)
	GetInteractionReportFunc     func(ctx context.Context, userID string, startStr, endStr string) (*models.InteractionReport, error)
	GetInteractionMadeReportFunc func(ctx context.Context, userID string, startStr, endStr string) (*models.InteractionReport, error)
}

func (m *MockReportService) RecordActivity(ctx context.Context, userID string) error {
	if m.RecordActivityFunc != nil {
		return m.RecordActivityFunc(ctx, userID)
	}
	return nil
}

func (m *MockReportService) GetUserActivityReport(ctx context.Context, userID string, startStr, endStr string) (*models.ActivityReport, error) {
	if m.GetUserActivityReportFunc != nil {
		return m.GetUserActivityReportFunc(ctx, userID, startStr, endStr)
	}
	return nil, nil
}

func (m *MockReportService) SubmitUserReport(ctx context.Context, reporterID string, req service.SubmitReportRequest) error {
	if m.SubmitUserReportFunc != nil {
		return m.SubmitUserReportFunc(ctx, reporterID, req)
	}
	return nil
}

func (m *MockReportService) GetAdminReports(ctx context.Context) ([]models.UserReportResponse, error) {
	if m.GetAdminReportsFunc != nil {
		return m.GetAdminReportsFunc(ctx)
	}
	return nil, nil
}

func (m *MockReportService) GetFederationReports(ctx context.Context, startStr, endStr string) (*models.FederationStats, error) {
	if m.GetFederationReportsFunc != nil {
		return m.GetFederationReportsFunc(ctx, startStr, endStr)
	}
	return nil, nil
}

func (m *MockReportService) GetInteractionReport(ctx context.Context, userID string, startStr, endStr string) (*models.InteractionReport, error) {
	if m.GetInteractionReportFunc != nil {
		return m.GetInteractionReportFunc(ctx, userID, startStr, endStr)
	}
	return nil, nil
}

func (m *MockReportService) GetInteractionMadeReport(ctx context.Context, userID string, startStr, endStr string) (*models.InteractionReport, error) {
	if m.GetInteractionMadeReportFunc != nil {
		return m.GetInteractionMadeReportFunc(ctx, userID, startStr, endStr)
	}
	return nil, nil
}
