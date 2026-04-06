package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/reports/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type reportService struct {
	repo ReportRepository
}

func NewReportService(repo ReportRepository) ReportService {
	return &reportService{
		repo: repo,
	}
}

func (s *reportService) RecordActivity(ctx context.Context, userIDStr string) error {
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}
	return s.repo.IncrementActivity(ctx, userID, time.Now().UTC())
}

func (s *reportService) GetUserActivityReport(ctx context.Context, userIDStr string, startStr, endStr string) (*models.ActivityReport, error) {
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	startDate, endDate := parseDateRange(startStr, endStr)

	activities, err := s.repo.GetActivity(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	var totalMinutes int
	for _, a := range activities {
		totalMinutes += a.Minutes
	}

	return &models.ActivityReport{
		TotalHours: float64(totalMinutes) / 60.0,
		DailyStats: activities,
	}, nil
}

func (s *reportService) SubmitUserReport(ctx context.Context, reporterIDStr string, req SubmitReportRequest) error {
	reporterID, err := primitive.ObjectIDFromHex(reporterIDStr)
	if err != nil {
		return errors.New("invalid reporter ID")
	}

	reportedID, err := primitive.ObjectIDFromHex(req.ReportedID)
	if err != nil {
		return errors.New("invalid reported user ID")
	}

	if reporterID == reportedID {
		return errors.New("cannot report yourself")
	}

	report := models.UserReport{
		ID:          primitive.NewObjectID(),
		ReporterID:  reporterID,
		ReportedID:  reportedID,
		Reason:      req.Reason,
		Description: req.Description,
		Status:      "pending",
		CreatedAt:   time.Now(),
	}

	if err := s.repo.CreateUserReport(ctx, report); err != nil {
		return err
	}

	// Check count and deactivate if necessary
	count, err := s.repo.CountReports(ctx, reportedID)
	if err == nil && count > 8 {
		// Log error but don't fail request if deactivation fails
		_ = s.repo.DeactivateUser(ctx, reportedID)
	}

	return nil
}

func (s *reportService) GetAdminReports(ctx context.Context) ([]models.UserReportResponse, error) {
	return s.repo.GetReports(ctx)
}

func (s *reportService) GetFederationReports(ctx context.Context, startStr, endStr string) (*models.FederationStats, error) {
	startDate, endDate := parseDateRange(startStr, endStr)
	return s.repo.GetFederationStats(ctx, startDate, endDate)
}

func (s *reportService) GetInteractionReport(ctx context.Context, userIDStr string, startStr, endStr string) (*models.InteractionReport, error) {
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	startDate, endDate := parseDateRange(startStr, endStr)

	interactions, err := s.repo.GetInteractionsReceived(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	return aggregateInteractions(interactions), nil
}

func (s *reportService) GetInteractionMadeReport(ctx context.Context, userIDStr string, startStr, endStr string) (*models.InteractionReport, error) {
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	startDate, endDate := parseDateRange(startStr, endStr)

	interactions, err := s.repo.GetInteractionsMade(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	return aggregateInteractions(interactions), nil
}

func (s *reportService) GetTrafficReport(ctx context.Context, startStr, endStr string) (*models.TrafficReport, error) {
	startDate, endDate := parseDateRange(startStr, endStr)
	return s.repo.GetTrafficReport(ctx, startDate, endDate)
}

// Helper functions (private)

func parseDateRange(startStr, endStr string) (time.Time, time.Time) {
	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30) // Default to 30 days

	if startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startDate = t.UTC()
		} else if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			startDate = t
		}
	}
	if endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			endDate = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, time.UTC)
		} else if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			endDate = t
		}
	}
	return startDate, endDate
}

func aggregateInteractions(interactions []models.DailyInteraction) *models.InteractionReport {
	var totalLikes, totalComments, totalFollows, totalPosts int
	for _, i := range interactions {
		totalLikes += i.Likes
		totalComments += i.Comments
		totalFollows += i.Follows
		totalPosts += i.Posts
	}

	return &models.InteractionReport{
		TotalLikes:    totalLikes,
		TotalComments: totalComments,
		TotalFollows:  totalFollows,
		TotalPosts:    totalPosts,
		DailyStats:    interactions,
	}
}
