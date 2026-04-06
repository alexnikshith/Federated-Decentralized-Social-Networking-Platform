package service

import (
	"context"
	"federated-social/backend/epics/reports/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReportRepository defines the methods for accessing report data
type ReportRepository interface {
	IncrementActivity(ctx context.Context, userID primitive.ObjectID, date time.Time) error
	GetActivity(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyActivity, error)
	CreateUserReport(ctx context.Context, report models.UserReport) error
	CountReports(ctx context.Context, reportedID primitive.ObjectID) (int64, error)
	DeactivateUser(ctx context.Context, userID primitive.ObjectID) error
	GetReports(ctx context.Context) ([]models.UserReportResponse, error)
	GetInteractionsMade(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error)
	GetInteractionsReceived(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error)
	GetReportedUserIDs(ctx context.Context, reporterID primitive.ObjectID) ([]primitive.ObjectID, error)
	IsUserReported(ctx context.Context, reporterID, reportedID primitive.ObjectID) (bool, error)
	GetFederationStats(ctx context.Context, startDate, endDate time.Time) (*models.FederationStats, error)
	GetTrafficReport(ctx context.Context, startDate, endDate time.Time) (*models.TrafficReport, error)
	CreateIndexes(ctx context.Context) error
}

// ReportService defines the business logic for reports
type ReportService interface {
	RecordActivity(ctx context.Context, userID string) error
	GetUserActivityReport(ctx context.Context, userID string, startStr, endStr string) (*models.ActivityReport, error)
	SubmitUserReport(ctx context.Context, reporterID string, req SubmitReportRequest) error
	GetAdminReports(ctx context.Context) ([]models.UserReportResponse, error)
	GetFederationReports(ctx context.Context, startStr, endStr string) (*models.FederationStats, error)
	GetInteractionReport(ctx context.Context, userID string, startStr, endStr string) (*models.InteractionReport, error)
	GetInteractionMadeReport(ctx context.Context, userID string, startStr, endStr string) (*models.InteractionReport, error)
	GetTrafficReport(ctx context.Context, startStr, endStr string) (*models.TrafficReport, error)
}

type SubmitReportRequest struct {
	ReportedID  string `json:"reported_id"`
	Reason      string `json:"reason"`
	Description string `json:"description"`
}
