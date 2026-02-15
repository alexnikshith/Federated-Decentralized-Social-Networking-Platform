package service

import (
	"context"
	federationModels "federated-social/backend/epics/federation/models"
	"federated-social/backend/epics/identity/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MockUserRepository implements UserRepository interface
type MockUserRepository struct {
	CreateUserFunc            func(ctx context.Context, user *models.User) error
	FindByEmailFunc           func(ctx context.Context, email string) (*models.User, error)
	FindByUsernameFunc        func(ctx context.Context, username string) (*models.User, error)
	FindByIDFunc              func(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	UpdateUserFunc            func(ctx context.Context, userID primitive.ObjectID, update bson.M) error
	AddJoinedCommunityFunc    func(ctx context.Context, userID primitive.ObjectID, communityID string) error
	RemoveJoinedCommunityFunc func(ctx context.Context, userID primitive.ObjectID, communityID string) error
	DeactivateUserFunc        func(ctx context.Context, userID primitive.ObjectID) error
	DeleteUserFunc            func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	if m.CreateUserFunc != nil {
		return m.CreateUserFunc(ctx, user)
	}
	return nil
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.FindByEmailFunc != nil {
		return m.FindByEmailFunc(ctx, email)
	}
	return nil, nil // Return nil, nil or error if needed in default
}

func (m *MockUserRepository) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	if m.FindByUsernameFunc != nil {
		return m.FindByUsernameFunc(ctx, username)
	}
	return nil, nil
}

func (m *MockUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
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
	if m.AddJoinedCommunityFunc != nil {
		return m.AddJoinedCommunityFunc(ctx, userID, communityID)
	}
	return nil
}

func (m *MockUserRepository) RemoveJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	if m.RemoveJoinedCommunityFunc != nil {
		return m.RemoveJoinedCommunityFunc(ctx, userID, communityID)
	}
	return nil
}

func (m *MockUserRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeactivateUserFunc != nil {
		return m.DeactivateUserFunc(ctx, userID)
	}
	return nil
}

func (m *MockUserRepository) DeleteUser(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteUserFunc != nil {
		return m.DeleteUserFunc(ctx, userID)
	}
	return nil
}

// MockSessionRepository implements SessionRepository interface
type MockSessionRepository struct {
	CreateSessionFunc             func(ctx context.Context, session *models.Session) error
	FindSessionByTokenFunc        func(ctx context.Context, token string) (*models.Session, error)
	InvalidateSessionFunc         func(ctx context.Context, token string) error
	InvalidateAllUserSessionsFunc func(ctx context.Context, userID primitive.ObjectID) error
	DeleteAllUserSessionsFunc     func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockSessionRepository) CreateSession(ctx context.Context, session *models.Session) error {
	if m.CreateSessionFunc != nil {
		return m.CreateSessionFunc(ctx, session)
	}
	return nil
}

func (m *MockSessionRepository) FindSessionByToken(ctx context.Context, token string) (*models.Session, error) {
	if m.FindSessionByTokenFunc != nil {
		return m.FindSessionByTokenFunc(ctx, token)
	}
	return nil, nil
}

func (m *MockSessionRepository) InvalidateSession(ctx context.Context, token string) error {
	if m.InvalidateSessionFunc != nil {
		return m.InvalidateSessionFunc(ctx, token)
	}
	return nil
}

func (m *MockSessionRepository) InvalidateAllUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	if m.InvalidateAllUserSessionsFunc != nil {
		return m.InvalidateAllUserSessionsFunc(ctx, userID)
	}
	return nil
}

func (m *MockSessionRepository) DeleteAllUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteAllUserSessionsFunc != nil {
		return m.DeleteAllUserSessionsFunc(ctx, userID)
	}
	return nil
}

// MockActivityRepository implements ActivityRepository interface
type MockActivityRepository struct {
	LogActivityFunc        func(ctx context.Context, log *models.ActivityLog) error
	GetUserActivityFunc    func(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error)
	DeleteUserActivityFunc func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockActivityRepository) LogActivity(ctx context.Context, log *models.ActivityLog) error {
	if m.LogActivityFunc != nil {
		return m.LogActivityFunc(ctx, log)
	}
	return nil
}

func (m *MockActivityRepository) GetUserActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error) {
	if m.GetUserActivityFunc != nil {
		return m.GetUserActivityFunc(ctx, userID, limit)
	}
	return nil, nil
}

func (m *MockActivityRepository) DeleteUserActivity(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteUserActivityFunc != nil {
		return m.DeleteUserActivityFunc(ctx, userID)
	}
	return nil
}

// MockVerificationRepository implements VerificationRepository interface
type MockVerificationRepository struct {
	CreateVerificationCodeFunc        func(ctx context.Context, code *models.VerificationCode) error
	FindLatestByUserIDFunc            func(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error)
	DeleteVerificationCodesByUserFunc func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockVerificationRepository) CreateVerificationCode(ctx context.Context, code *models.VerificationCode) error {
	if m.CreateVerificationCodeFunc != nil {
		return m.CreateVerificationCodeFunc(ctx, code)
	}
	return nil
}

func (m *MockVerificationRepository) FindLatestByUserID(ctx context.Context, userID primitive.ObjectID) (*models.VerificationCode, error) {
	if m.FindLatestByUserIDFunc != nil {
		return m.FindLatestByUserIDFunc(ctx, userID)
	}
	return nil, nil
}

func (m *MockVerificationRepository) DeleteVerificationCodesByUser(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteVerificationCodesByUserFunc != nil {
		return m.DeleteVerificationCodesByUserFunc(ctx, userID)
	}
	return nil
}

// MockEmailSender implements EmailSender interface
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
	if m.SendPasswordResetEmailFunc != nil {
		return m.SendPasswordResetEmailFunc(to, code)
	}
	return nil
}

// MockFollowRepository implements FollowRepository interface
type MockFollowRepository struct {
	CountFollowersFunc   func(ctx context.Context, userID primitive.ObjectID) (int64, error)
	CountFollowingFunc   func(ctx context.Context, userID primitive.ObjectID) (int64, error)
	DeleteAllFollowsFunc func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockFollowRepository) CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	if m.CountFollowersFunc != nil {
		return m.CountFollowersFunc(ctx, userID)
	}
	return 0, nil
}

func (m *MockFollowRepository) CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	if m.CountFollowingFunc != nil {
		return m.CountFollowingFunc(ctx, userID)
	}
	return 0, nil
}

func (m *MockFollowRepository) DeleteAllFollows(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteAllFollowsFunc != nil {
		return m.DeleteAllFollowsFunc(ctx, userID)
	}
	return nil
}

type MockFollowService struct {
	IsFollowingFunc    func(ctx context.Context, followerID, followedID primitive.ObjectID) (bool, error)
	CountFollowersFunc func(ctx context.Context, userID primitive.ObjectID) (int64, error)
	CountFollowingFunc func(ctx context.Context, userID primitive.ObjectID) (int64, error)
}

func (m *MockFollowService) IsFollowing(ctx context.Context, followerID, followedID primitive.ObjectID) (bool, error) {
	if m.IsFollowingFunc != nil {
		return m.IsFollowingFunc(ctx, followerID, followedID)
	}
	return false, nil
}
func (m *MockFollowService) CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	if m.CountFollowersFunc != nil {
		return m.CountFollowersFunc(ctx, userID)
	}
	return 0, nil
}
func (m *MockFollowService) CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	if m.CountFollowingFunc != nil {
		return m.CountFollowingFunc(ctx, userID)
	}
	return 0, nil
}

type MockPostRepository struct {
	CountPostsByAuthorFunc   func(ctx context.Context, userID primitive.ObjectID) (int64, error)
	DeletePostsByAuthorFunc  func(ctx context.Context, userID primitive.ObjectID) error
	DeleteLikesByUserFunc    func(ctx context.Context, userID primitive.ObjectID) error
	DeleteCommentsByUserFunc func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockPostRepository) CountPostsByAuthor(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	if m.CountPostsByAuthorFunc != nil {
		return m.CountPostsByAuthorFunc(ctx, userID)
	}
	return 0, nil
}

func (m *MockPostRepository) DeletePostsByAuthor(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeletePostsByAuthorFunc != nil {
		return m.DeletePostsByAuthorFunc(ctx, userID)
	}
	return nil
}

func (m *MockPostRepository) DeleteLikesByUser(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteLikesByUserFunc != nil {
		return m.DeleteLikesByUserFunc(ctx, userID)
	}
	return nil
}

func (m *MockPostRepository) DeleteCommentsByUser(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteCommentsByUserFunc != nil {
		return m.DeleteCommentsByUserFunc(ctx, userID)
	}
	return nil
}

type MockNotificationRepository struct {
	DeleteUserNotificationsFunc func(ctx context.Context, userID primitive.ObjectID) error
}

func (m *MockNotificationRepository) DeleteUserNotifications(ctx context.Context, userID primitive.ObjectID) error {
	if m.DeleteUserNotificationsFunc != nil {
		return m.DeleteUserNotificationsFunc(ctx, userID)
	}
	return nil
}

type MockRemoteUserRepository struct {
	GetRemoteUserByIDFunc       func(ctx context.Context, userID primitive.ObjectID) (*federationModels.RemoteUser, error)
	GetRemoteUserByActorIDFunc  func(ctx context.Context, actorID string) (*federationModels.RemoteUser, error)
	GetRemoteUserByUsernameFunc func(ctx context.Context, username string) (*federationModels.RemoteUser, error)
}

func (m *MockRemoteUserRepository) GetRemoteUserByID(ctx context.Context, userID primitive.ObjectID) (*federationModels.RemoteUser, error) {
	if m.GetRemoteUserByIDFunc != nil {
		return m.GetRemoteUserByIDFunc(ctx, userID)
	}
	return nil, nil
}

func (m *MockRemoteUserRepository) GetRemoteUserByActorID(ctx context.Context, actorID string) (*federationModels.RemoteUser, error) {
	if m.GetRemoteUserByActorIDFunc != nil {
		return m.GetRemoteUserByActorIDFunc(ctx, actorID)
	}
	return nil, nil
}

func (m *MockRemoteUserRepository) GetRemoteUserByUsername(ctx context.Context, username string) (*federationModels.RemoteUser, error) {
	if m.GetRemoteUserByUsernameFunc != nil {
		return m.GetRemoteUserByUsernameFunc(ctx, username)
	}
	return nil, nil
}
