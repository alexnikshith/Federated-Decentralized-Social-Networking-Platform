package service

import (
	"context"
	"federated-social/backend/epics/reports/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MockReportRepository struct {
	IncrementActivityFunc       func(ctx context.Context, userID primitive.ObjectID, date time.Time) error
	GetActivityFunc             func(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyActivity, error)
	CreateUserReportFunc        func(ctx context.Context, report models.UserReport) error
	CountReportsFunc            func(ctx context.Context, reportedID primitive.ObjectID) (int64, error)
	DeactivateUserFunc          func(ctx context.Context, userID primitive.ObjectID) error
	GetReportsFunc              func(ctx context.Context) ([]models.UserReportResponse, error)
	GetInteractionsMadeFunc     func(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error)
	GetInteractionsReceivedFunc func(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error)
	GetReportedUserIDsFunc      func(ctx context.Context, reporterID primitive.ObjectID) ([]primitive.ObjectID, error)
	IsUserReportedFunc          func(ctx context.Context, reporterID, reportedID primitive.ObjectID) (bool, error)
	GetFederationStatsFunc      func(ctx context.Context, startDate, endDate time.Time) (*models.FederationStats, error)
	CreateIndexesFunc           func(ctx context.Context) error
}

func (m *MockReportRepository) IncrementActivity(ctx context.Context, userID primitive.ObjectID, date time.Time) error {
	if m.IncrementActivityFunc != nil {
		return m.IncrementActivityFunc(ctx, userID, date)
	}
	return nil
}

func (m *MockReportRepository) GetActivity(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyActivity, error) {
	if m.GetActivityFunc != nil {
		return m.GetActivityFunc(ctx, userID, startDate, endDate)
	}
	return nil, nil
}

func (m *MockReportRepository) CreateUserReport(ctx context.Context, report models.UserReport) error {
	if m.CreateUserReportFunc != nil {
		return m.CreateUserReportFunc(ctx, report)
	}
	return nil
}

func (m *MockReportRepository) CountReports(ctx context.Context, reportedID primitive.ObjectID) (int64, error) {
	if m.CountReportsFunc != nil {
		return m.CountReportsFunc(ctx, reportedID)
	}
	return 0, nil
}

func (m *MockReportRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeactivateUserFunc != nil {
		return m.DeactivateUserFunc(ctx, userID)
	}
	return nil
}

func (m *MockReportRepository) GetReports(ctx context.Context) ([]models.UserReportResponse, error) {
	if m.GetReportsFunc != nil {
		return m.GetReportsFunc(ctx)
	}
	return nil, nil
}

func (m *MockReportRepository) GetInteractionsMade(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error) {
	if m.GetInteractionsMadeFunc != nil {
		return m.GetInteractionsMadeFunc(ctx, userID, startDate, endDate)
	}
	return nil, nil
}

func (m *MockReportRepository) GetInteractionsReceived(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error) {
	if m.GetInteractionsReceivedFunc != nil {
		return m.GetInteractionsReceivedFunc(ctx, userID, startDate, endDate)
	}
	return nil, nil
}

func (m *MockReportRepository) GetReportedUserIDs(ctx context.Context, reporterID primitive.ObjectID) ([]primitive.ObjectID, error) {
	if m.GetReportedUserIDsFunc != nil {
		return m.GetReportedUserIDsFunc(ctx, reporterID)
	}
	return nil, nil
}

func (m *MockReportRepository) IsUserReported(ctx context.Context, reporterID, reportedID primitive.ObjectID) (bool, error) {
	if m.IsUserReportedFunc != nil {
		return m.IsUserReportedFunc(ctx, reporterID, reportedID)
	}
	return false, nil
}

func (m *MockReportRepository) GetFederationStats(ctx context.Context, startDate, endDate time.Time) (*models.FederationStats, error) {
	if m.GetFederationStatsFunc != nil {
		return m.GetFederationStatsFunc(ctx, startDate, endDate)
	}
	return nil, nil
}

func (m *MockReportRepository) CreateIndexes(ctx context.Context) error {
	if m.CreateIndexesFunc != nil {
		return m.CreateIndexesFunc(ctx)
	}
	return nil
}
