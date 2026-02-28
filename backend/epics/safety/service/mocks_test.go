package service_test

import (
	"context"
	"federated-social/backend/epics/identity/models"
	reportModels "federated-social/backend/epics/reports/models"
	safetyModels "federated-social/backend/epics/safety/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MockUserRepository implements repository.UserRepository
type MockUserRepository struct {
	CreateUserFunc             func(ctx context.Context, user *models.User) error
	FindByEmailFunc            func(ctx context.Context, email string) (*models.User, error)
	FindByUsernameFunc         func(ctx context.Context, username string) (*models.User, error)
	FindByIDFunc               func(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	UpdateUserFunc             func(ctx context.Context, userID primitive.ObjectID, update bson.M) error
	AddJoinedCommunityFunc     func(ctx context.Context, userID primitive.ObjectID, communityID string) error
	RemoveJoinedCommunityFunc  func(ctx context.Context, userID primitive.ObjectID, communityID string) error
	DeactivateUserFunc         func(ctx context.Context, userID primitive.ObjectID) error
	DeleteUserFunc             func(ctx context.Context, userID primitive.ObjectID) error
	FindByIDsFunc              func(ctx context.Context, ids []primitive.ObjectID) ([]models.User, error)
	CreateIndexesFunc          func(ctx context.Context) error
	Enable2FAForAllFunc        func(ctx context.Context) error
	CountAllFunc               func(ctx context.Context) (int64, error)
	FindAllFunc                func(ctx context.Context) ([]models.User, error)
	MigrateGlobalDiscoveryFunc func(ctx context.Context) error
}

func (m *MockUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	return m.CreateUserFunc(ctx, user)
}
func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	return m.FindByEmailFunc(ctx, email)
}
func (m *MockUserRepository) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	return m.FindByUsernameFunc(ctx, username)
}
func (m *MockUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *MockUserRepository) UpdateUser(ctx context.Context, userID primitive.ObjectID, update bson.M) error {
	return m.UpdateUserFunc(ctx, userID, update)
}
func (m *MockUserRepository) AddJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	return m.AddJoinedCommunityFunc(ctx, userID, communityID)
}
func (m *MockUserRepository) RemoveJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	return m.RemoveJoinedCommunityFunc(ctx, userID, communityID)
}
func (m *MockUserRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	return m.DeactivateUserFunc(ctx, userID)
}
func (m *MockUserRepository) DeleteUser(ctx context.Context, userID primitive.ObjectID) error {
	return m.DeleteUserFunc(ctx, userID)
}
func (m *MockUserRepository) FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]models.User, error) {
	return m.FindByIDsFunc(ctx, ids)
}
func (m *MockUserRepository) CreateIndexes(ctx context.Context) error {
	if m.CreateIndexesFunc != nil {
		return m.CreateIndexesFunc(ctx)
	}
	return nil
}
func (m *MockUserRepository) Enable2FAForAll(ctx context.Context) error {
	return m.Enable2FAForAllFunc(ctx)
}
func (m *MockUserRepository) CountAll(ctx context.Context) (int64, error) {
	return m.CountAllFunc(ctx)
}
func (m *MockUserRepository) FindAll(ctx context.Context) ([]models.User, error) {
	return m.FindAllFunc(ctx)
}
func (m *MockUserRepository) MigrateGlobalDiscovery(ctx context.Context) error {
	return m.MigrateGlobalDiscoveryFunc(ctx)
}

// MockSessionRepository implements repository.SessionRepository
type MockSessionRepository struct {
	CreateSessionFunc             func(ctx context.Context, session *models.Session) error
	FindSessionByTokenFunc        func(ctx context.Context, token string) (*models.Session, error)
	InvalidateSessionFunc         func(ctx context.Context, token string) error
	InvalidateAllUserSessionsFunc func(ctx context.Context, userID primitive.ObjectID) error
	DeleteAllUserSessionsFunc     func(ctx context.Context, userID primitive.ObjectID) error
	CleanupExpiredSessionsFunc    func(ctx context.Context) error
}

func (m *MockSessionRepository) CreateSession(ctx context.Context, session *models.Session) error {
	return m.CreateSessionFunc(ctx, session)
}
func (m *MockSessionRepository) FindSessionByToken(ctx context.Context, token string) (*models.Session, error) {
	return m.FindSessionByTokenFunc(ctx, token)
}
func (m *MockSessionRepository) InvalidateSession(ctx context.Context, token string) error {
	return m.InvalidateSessionFunc(ctx, token)
}
func (m *MockSessionRepository) InvalidateAllUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	return m.InvalidateAllUserSessionsFunc(ctx, userID)
}
func (m *MockSessionRepository) DeleteAllUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	return m.DeleteAllUserSessionsFunc(ctx, userID)
}
func (m *MockSessionRepository) CleanupExpiredSessions(ctx context.Context) error {
	return m.CleanupExpiredSessionsFunc(ctx)
}

// MockActivityRepository ...
type MockActivityRepository struct {
	LogActivityFunc        func(ctx context.Context, log *models.ActivityLog) error
	GetUserActivityFunc    func(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error)
	DeleteUserActivityFunc func(ctx context.Context, userID primitive.ObjectID) error
	CountDailyActivityFunc func(ctx context.Context) (int64, error)
}

func (m *MockActivityRepository) LogActivity(ctx context.Context, log *models.ActivityLog) error {
	if m.LogActivityFunc != nil {
		return m.LogActivityFunc(ctx, log)
	}
	return nil
}
func (m *MockActivityRepository) GetUserActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error) {
	return m.GetUserActivityFunc(ctx, userID, limit)
}
func (m *MockActivityRepository) DeleteUserActivity(ctx context.Context, userID primitive.ObjectID) error {
	return m.DeleteUserActivityFunc(ctx, userID)
}
func (m *MockActivityRepository) CountDailyActivity(ctx context.Context) (int64, error) {
	return m.CountDailyActivityFunc(ctx)
}

// MockVerificationRepository ...
type MockVerificationRepository struct {
	CreateVerificationCodeFunc        func(ctx context.Context, code *models.VerificationCode) error
	FindLatestByUserIDFunc            func(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error)
	DeleteVerificationCodesByUserFunc func(ctx context.Context, userID primitive.ObjectID) error
	CreateIndexesFunc                 func(ctx context.Context) error
}

func (m *MockVerificationRepository) CreateVerificationCode(ctx context.Context, code *models.VerificationCode) error {
	return m.CreateVerificationCodeFunc(ctx, code)
}
func (m *MockVerificationRepository) FindLatestByUserID(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error) {
	return m.FindLatestByUserIDFunc(ctx, userID)
}
func (m *MockVerificationRepository) DeleteVerificationCodesByUser(ctx context.Context, userID primitive.ObjectID) error {
	return m.DeleteVerificationCodesByUserFunc(ctx, userID)
}
func (m *MockVerificationRepository) CreateIndexes(ctx context.Context) error {
	return m.CreateIndexesFunc(ctx)
}

// MockEmailSender ...
type MockEmailSender struct {
	SendVerificationEmailFunc  func(to string, code string) error
	SendPasswordResetEmailFunc func(to string, code string) error
}

func (m *MockEmailSender) SendVerificationEmail(to string, code string) error {
	if m.SendVerificationEmailFunc != nil {
		return m.SendVerificationEmailFunc(to, code)
	}
	return nil
}
func (m *MockEmailSender) SendPasswordResetEmail(to string, code string) error {
	return m.SendPasswordResetEmailFunc(to, code)
}

// MockBlockRepository ...
type MockBlockRepository struct {
	BlockUserFunc                  func(ctx context.Context, block *safetyModels.Block) error
	UnblockUserFunc                func(ctx context.Context, blockerID, blockedID primitive.ObjectID) error
	IsBlockedFunc                  func(ctx context.Context, blockerID, blockedID primitive.ObjectID) (bool, error)
	GetBlockedUsersFunc            func(ctx context.Context, blockerID primitive.ObjectID) ([]safetyModels.Block, error)
	GetBidirectionalBlockedIDsFunc func(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error)
	CreateIndexesFunc              func(ctx context.Context) error
}

func (m *MockBlockRepository) BlockUser(ctx context.Context, block *safetyModels.Block) error {
	return m.BlockUserFunc(ctx, block)
}
func (m *MockBlockRepository) UnblockUser(ctx context.Context, blockerID, blockedID primitive.ObjectID) error {
	return m.UnblockUserFunc(ctx, blockerID, blockedID)
}
func (m *MockBlockRepository) IsBlocked(ctx context.Context, blockerID, blockedID primitive.ObjectID) (bool, error) {
	return m.IsBlockedFunc(ctx, blockerID, blockedID)
}
func (m *MockBlockRepository) GetBlockedUsers(ctx context.Context, blockerID primitive.ObjectID) ([]safetyModels.Block, error) {
	return m.GetBlockedUsersFunc(ctx, blockerID)
}
func (m *MockBlockRepository) GetBidirectionalBlockedIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	return m.GetBidirectionalBlockedIDsFunc(ctx, userID)
}
func (m *MockBlockRepository) CreateIndexes(ctx context.Context) error {
	return m.CreateIndexesFunc(ctx)
}

// MockReportRepository ...
type MockReportRepository struct {
	IncrementActivityFunc       func(ctx context.Context, userID primitive.ObjectID, date time.Time) error
	GetActivityFunc             func(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyActivity, error)
	CreateUserReportFunc        func(ctx context.Context, report reportModels.UserReport) error
	CountReportsFunc            func(ctx context.Context, reportedID primitive.ObjectID) (int64, error)
	DeactivateUserFunc          func(ctx context.Context, userID primitive.ObjectID) error
	GetReportsFunc              func(ctx context.Context) ([]reportModels.UserReportResponse, error)
	GetInteractionsMadeFunc     func(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyInteraction, error)
	GetInteractionsReceivedFunc func(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyInteraction, error)
	GetReportedUserIDsFunc      func(ctx context.Context, reporterID primitive.ObjectID) ([]primitive.ObjectID, error)
	IsUserReportedFunc          func(ctx context.Context, reporterID, reportedID primitive.ObjectID) (bool, error)
	GetFederationStatsFunc      func(ctx context.Context, startDate, endDate time.Time) (*reportModels.FederationStats, error)
	GetTrafficReportFunc        func(ctx context.Context, startDate, endDate time.Time) (*reportModels.TrafficReport, error)
	CreateIndexesFunc           func(ctx context.Context) error
}

func (m *MockReportRepository) IncrementActivity(ctx context.Context, userID primitive.ObjectID, date time.Time) error {
	return m.IncrementActivityFunc(ctx, userID, date)
}
func (m *MockReportRepository) GetActivity(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyActivity, error) {
	return m.GetActivityFunc(ctx, userID, startDate, endDate)
}
func (m *MockReportRepository) CreateUserReport(ctx context.Context, report reportModels.UserReport) error {
	return m.CreateUserReportFunc(ctx, report)
}
func (m *MockReportRepository) CountReports(ctx context.Context, reportedID primitive.ObjectID) (int64, error) {
	return m.CountReportsFunc(ctx, reportedID)
}
func (m *MockReportRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	return m.DeactivateUserFunc(ctx, userID)
}
func (m *MockReportRepository) GetReports(ctx context.Context) ([]reportModels.UserReportResponse, error) {
	return m.GetReportsFunc(ctx)
}
func (m *MockReportRepository) GetInteractionsMade(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyInteraction, error) {
	return m.GetInteractionsMadeFunc(ctx, userID, startDate, endDate)
}
func (m *MockReportRepository) GetInteractionsReceived(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]reportModels.DailyInteraction, error) {
	return m.GetInteractionsReceivedFunc(ctx, userID, startDate, endDate)
}
func (m *MockReportRepository) GetReportedUserIDs(ctx context.Context, reporterID primitive.ObjectID) ([]primitive.ObjectID, error) {
	return m.GetReportedUserIDsFunc(ctx, reporterID)
}
func (m *MockReportRepository) IsUserReported(ctx context.Context, reporterID, reportedID primitive.ObjectID) (bool, error) {
	return m.IsUserReportedFunc(ctx, reporterID, reportedID)
}
func (m *MockReportRepository) GetFederationStats(ctx context.Context, startDate, endDate time.Time) (*reportModels.FederationStats, error) {
	return m.GetFederationStatsFunc(ctx, startDate, endDate)
}

func (m *MockReportRepository) GetTrafficReport(ctx context.Context, startDate, endDate time.Time) (*reportModels.TrafficReport, error) {
	if m.GetTrafficReportFunc != nil {
		return m.GetTrafficReportFunc(ctx, startDate, endDate)
	}
	return nil, nil
}
func (m *MockReportRepository) CreateIndexes(ctx context.Context) error {
	return m.CreateIndexesFunc(ctx)
}
