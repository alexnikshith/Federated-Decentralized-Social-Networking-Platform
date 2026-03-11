package handlers

import (
	"context"
	contentModels "federated-social/backend/epics/content-sharing/models"
	identityModels "federated-social/backend/epics/identity/models"
	reportModels "federated-social/backend/epics/reports/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MockUserRepository
type MockUserRepository struct {
	FindByIDFunc   func(ctx context.Context, id primitive.ObjectID) (*identityModels.User, error)
	FindAllFunc    func(ctx context.Context) ([]identityModels.User, error)
	UpdateUserFunc func(ctx context.Context, userID primitive.ObjectID, update bson.M) error
	DeleteUserFunc func(ctx context.Context, userID primitive.ObjectID) error
	CountAllFunc   func(ctx context.Context) (int64, error)
}

func (m *MockUserRepository) CreateUser(ctx context.Context, user *identityModels.User) error {
	return nil
}
func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*identityModels.User, error) {
	return nil, nil
}
func (m *MockUserRepository) FindByUsername(ctx context.Context, username string) (*identityModels.User, error) {
	return nil, nil
}
func (m *MockUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*identityModels.User, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *MockUserRepository) UpdateUser(ctx context.Context, userID primitive.ObjectID, update bson.M) error {
	if m.UpdateUserFunc != nil {
		return m.UpdateUserFunc(ctx, userID, update)
	}
	return nil
}
func (m *MockUserRepository) AddJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	return nil
}
func (m *MockUserRepository) RemoveJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	return nil
}
func (m *MockUserRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockUserRepository) DeleteUser(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteUserFunc != nil {
		return m.DeleteUserFunc(ctx, userID)
	}
	return nil
}
func (m *MockUserRepository) FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]identityModels.User, error) {
	return nil, nil
}
func (m *MockUserRepository) CreateIndexes(ctx context.Context) error   { return nil }
func (m *MockUserRepository) Enable2FAForAll(ctx context.Context) error { return nil }
func (m *MockUserRepository) CountAll(ctx context.Context) (int64, error) {
	if m.CountAllFunc != nil {
		return m.CountAllFunc(ctx)
	}
	return 0, nil
}
func (m *MockUserRepository) FindAll(ctx context.Context) ([]identityModels.User, error) {
	if m.FindAllFunc != nil {
		return m.FindAllFunc(ctx)
	}
	return nil, nil
}
func (m *MockUserRepository) MigrateGlobalDiscovery(ctx context.Context) error { return nil }

// MockPostRepository
type MockPostRepository struct {
	CountAllFunc            func(ctx context.Context) (int64, error)
	DeletePostFunc          func(ctx context.Context, id primitive.ObjectID) error
	GetReportByIDFunc       func(ctx context.Context, id primitive.ObjectID) (*contentModels.ReportedPost, error)
	UpdatePostStatusFunc    func(ctx context.Context, postID primitive.ObjectID, status string) error
	DeleteReportFunc        func(ctx context.Context, id primitive.ObjectID) error
	DeletePostsByAuthorFunc func(ctx context.Context, authorID primitive.ObjectID) error
}

func (m *MockPostRepository) CountAll(ctx context.Context) (int64, error) {
	if m.CountAllFunc != nil {
		return m.CountAllFunc(ctx)
	}
	return 0, nil
}
func (m *MockPostRepository) DeletePost(ctx context.Context, id primitive.ObjectID) error {
	if m.DeletePostFunc != nil {
		return m.DeletePostFunc(ctx, id)
	}
	return nil
}
func (m *MockPostRepository) DeletePostsByAuthor(ctx context.Context, authorID primitive.ObjectID) error {
	if m.DeletePostsByAuthorFunc != nil {
		return m.DeletePostsByAuthorFunc(ctx, authorID)
	}
	return nil
}
func (m *MockPostRepository) DeleteLikesByUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockPostRepository) DeleteCommentsByUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockPostRepository) DeleteSavedPostsByUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockPostRepository) DeleteReportsByUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockPostRepository) DeleteInteractionsByUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockPostRepository) GetReportByID(ctx context.Context, id primitive.ObjectID) (*contentModels.ReportedPost, error) {
	if m.GetReportByIDFunc != nil {
		return m.GetReportByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *MockPostRepository) UpdatePostStatus(ctx context.Context, postID primitive.ObjectID, status string) error {
	if m.UpdatePostStatusFunc != nil {
		return m.UpdatePostStatusFunc(ctx, postID, status)
	}
	return nil
}
func (m *MockPostRepository) DeleteReport(ctx context.Context, id primitive.ObjectID) error {
	if m.DeleteReportFunc != nil {
		return m.DeleteReportFunc(ctx, id)
	}
	return nil
}
func (m *MockPostRepository) CreateIndexes(ctx context.Context) error { return nil }

// MockStoryRepository
type MockStoryRepository struct{}

func (m *MockStoryRepository) DeleteStoriesByAuthor(ctx context.Context, authorID primitive.ObjectID) error {
	return nil
}
func (m *MockStoryRepository) CreateIndexes(ctx context.Context) error { return nil }

// MockMessageRepository
type MockMessageRepository struct{}

func (m *MockMessageRepository) DeleteConversationsByUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockMessageRepository) DeleteMessagesByUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockMessageRepository) CreateIndexes(ctx context.Context) error { return nil }

// MockActivityRepository
type MockActivityRepository struct {
	CountDailyActivityFunc func(ctx context.Context) (int64, error)
}

func (m *MockActivityRepository) LogActivity(ctx context.Context, log *identityModels.ActivityLog) error {
	return nil
}
func (m *MockActivityRepository) GetUserActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]identityModels.ActivityLog, error) {
	return nil, nil
}
func (m *MockActivityRepository) DeleteUserActivity(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockActivityRepository) CountDailyActivity(ctx context.Context) (int64, error) {
	if m.CountDailyActivityFunc != nil {
		return m.CountDailyActivityFunc(ctx)
	}
	return 0, nil
}
func (m *MockActivityRepository) CreateIndexes(ctx context.Context) error { return nil }

// MockSessionRepository
type MockSessionRepository struct {
	InvalidateAllUserSessionsFunc func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockSessionRepository) CreateSession(ctx context.Context, session *identityModels.Session) error {
	return nil
}
func (m *MockSessionRepository) FindSessionByToken(ctx context.Context, token string) (*identityModels.Session, error) {
	return nil, nil
}
func (m *MockSessionRepository) InvalidateSession(ctx context.Context, token string) error {
	return nil
}
func (m *MockSessionRepository) InvalidateAllUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	if m.InvalidateAllUserSessionsFunc != nil {
		return m.InvalidateAllUserSessionsFunc(ctx, userID)
	}
	return nil
}
func (m *MockSessionRepository) DeleteAllUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockSessionRepository) CleanupExpiredSessions(ctx context.Context) error { return nil }
func (m *MockSessionRepository) CreateIndexes(ctx context.Context) error          { return nil }

// MockFollowRepository
type MockFollowRepository struct{}

func (m *MockFollowRepository) DeleteAllFollows(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockFollowRepository) CreateIndexes(ctx context.Context) error { return nil }

// MockNotificationRepository
type MockNotificationRepository struct{}

func (m *MockNotificationRepository) DeleteUserNotifications(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockNotificationRepository) CreateIndexes(ctx context.Context) error { return nil }

// MockReportRepository (for reportService)
type MockReportsRepository struct {
	GetTrafficReportFunc func(ctx context.Context, startDate, endDate time.Time) (*reportModels.TrafficReport, error)
}

func (m *MockReportsRepository) IncrementActivity(ctx context.Context, userID primitive.ObjectID, date time.Time) error {
	return nil
}
func (m *MockReportsRepository) GetActivity(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyActivity, error) {
	return nil, nil
}
func (m *MockReportsRepository) CreateUserReport(ctx context.Context, report reportModels.UserReport) error {
	return nil
}
func (m *MockReportsRepository) CountReports(ctx context.Context, reportedID primitive.ObjectID) (int64, error) {
	return 0, nil
}
func (m *MockReportsRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	return nil
}
func (m *MockReportsRepository) GetReports(ctx context.Context) ([]reportModels.UserReportResponse, error) {
	return nil, nil
}
func (m *MockReportsRepository) GetFederationStats(ctx context.Context, startDate, endDate time.Time) (*reportModels.FederationStats, error) {
	return nil, nil
}
func (m *MockReportsRepository) GetInteractionsReceived(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyInteraction, error) {
	return nil, nil
}
func (m *MockReportsRepository) GetInteractionsMade(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyInteraction, error) {
	return nil, nil
}
func (m *MockReportsRepository) GetTrafficReport(ctx context.Context, startDate, endDate time.Time) (*reportModels.TrafficReport, error) {
	if m.GetTrafficReportFunc != nil {
		return m.GetTrafficReportFunc(ctx, startDate, endDate)
	}
	return nil, nil
}
func (m *MockReportsRepository) ResolveReport(ctx context.Context, reportID primitive.ObjectID) error {
	return nil
}
func (m *MockReportsRepository) CreateIndexes(ctx context.Context) error { return nil }
func (m *MockReportsRepository) GetReportedUserIDs(ctx context.Context, reporterID primitive.ObjectID) ([]primitive.ObjectID, error) {
	return nil, nil
}
func (m *MockReportsRepository) IsUserReported(ctx context.Context, reporterID, reportedID primitive.ObjectID) (bool, error) {
	return false, nil
}

// MockEmailSender
type MockEmailSender struct {
	SendAccountDeactivationNotificationFunc func(toEmail, username, reason string) error
}

func (m *MockEmailSender) SendVerificationEmail(toEmail, code string) error { return nil }
func (m *MockEmailSender) SendAdminRoleNotification(toEmail, username, newRole string) error {
	return nil
}
func (m *MockEmailSender) SendAccountDeactivationNotification(toEmail, username, reason string) error {
	if m.SendAccountDeactivationNotificationFunc != nil {
		return m.SendAccountDeactivationNotificationFunc(toEmail, username, reason)
	}
	return nil
}
func (m *MockEmailSender) SendPasswordResetEmail(toEmail, code string) error { return nil }
