package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"federated-social/backend/epics/federation/models"
	identityModels "federated-social/backend/epics/identity/models"
	"io"
	"net/http"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// --- Mocks ---

// mockInstanceRepo simulates the InstanceRepository for testing purposes
type mockInstanceRepo struct {
	getInstanceByDomainFunc      func(ctx context.Context, domain string) (*models.Instance, error)
	upsertInstanceFunc           func(ctx context.Context, instance *models.Instance) error
	getInstancesByTrustLevelFunc func(ctx context.Context, trustLevel string) ([]models.Instance, error)
	updateInstanceLastSeenFunc   func(ctx context.Context, domain string) error
}

func (m *mockInstanceRepo) GetInstanceByDomain(ctx context.Context, domain string) (*models.Instance, error) {
	return m.getInstanceByDomainFunc(ctx, domain)
}
func (m *mockInstanceRepo) UpsertInstance(ctx context.Context, instance *models.Instance) error {
	return m.upsertInstanceFunc(ctx, instance)
}
func (m *mockInstanceRepo) GetInstancesByTrustLevel(ctx context.Context, trustLevel string) ([]models.Instance, error) {
	if m.getInstancesByTrustLevelFunc != nil {
		return m.getInstancesByTrustLevelFunc(ctx, trustLevel)
	}
	return nil, nil
}
func (m *mockInstanceRepo) UpdateInstanceLastSeen(ctx context.Context, domain string) error {
	if m.updateInstanceLastSeenFunc != nil {
		return m.updateInstanceLastSeenFunc(ctx, domain)
	}
	return nil
}

type mockHTTPClient struct {
	getFunc func(url string) (*http.Response, error)
	doFunc  func(req *http.Request) (*http.Response, error)
}

func (m *mockHTTPClient) Get(url string) (*http.Response, error) {
	return m.getFunc(url)
}
func (m *mockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	if m.doFunc != nil {
		return m.doFunc(req)
	}
	return nil, nil
}

type mockFederationEventRepo struct {
	createEventFunc func(ctx context.Context, event *models.FederationEvent) error
}

func (m *mockFederationEventRepo) CreateEvent(ctx context.Context, event *models.FederationEvent) error {
	if m.createEventFunc != nil {
		return m.createEventFunc(ctx, event)
	}
	return nil
}

// Stubs for other repos (implement as needed)
type mockRemoteUserRepo struct {
	upsertRemoteUserFunc func(ctx context.Context, remoteUser *models.RemoteUser) error
}

func (m *mockRemoteUserRepo) UpsertRemoteUser(ctx context.Context, remoteUser *models.RemoteUser) error {
	if m.upsertRemoteUserFunc != nil {
		return m.upsertRemoteUserFunc(ctx, remoteUser)
	}
	return nil
}
func (m *mockRemoteUserRepo) GetRemoteUsersByActorIDs(ctx context.Context, actorIDs []string) (map[string]*models.RemoteUser, error) {
	return nil, nil
}
func (m *mockRemoteUserRepo) GetRemoteUserByID(ctx context.Context, id primitive.ObjectID) (*models.RemoteUser, error) {
	return nil, nil
}

type mockRemotePostRepo struct {
	upsertRemotePostFunc func(ctx context.Context, remotePost *models.RemotePost) error
}

func (m *mockRemotePostRepo) UpsertRemotePost(ctx context.Context, remotePost *models.RemotePost) error {
	if m.upsertRemotePostFunc != nil {
		return m.upsertRemotePostFunc(ctx, remotePost)
	}
	return nil
}
func (m *mockRemotePostRepo) DeleteRemotePost(ctx context.Context, remotePostID string) error {
	return nil
}
func (m *mockRemotePostRepo) GetRemotePostsByAuthors(ctx context.Context, actorIDs []string, limit int64) ([]models.RemotePost, error) {
	return nil, nil
}

type mockRelationshipsRepo struct {
	addRemoteFollowerFunc func(ctx context.Context, follower *models.RemoteFollower) error
}

func (m *mockRelationshipsRepo) AddRemoteFollower(ctx context.Context, follower *models.RemoteFollower) error {
	if m.addRemoteFollowerFunc != nil {
		return m.addRemoteFollowerFunc(ctx, follower)
	}
	return nil
}
func (m *mockRelationshipsRepo) AddRemoteFollow(ctx context.Context, follow *models.RemoteFollow) error {
	return nil
}
func (m *mockRelationshipsRepo) RemoveRemoteFollow(ctx context.Context, localUserID primitive.ObjectID, remoteActorID, username, instance string) error {
	return nil
}
func (m *mockRelationshipsRepo) GetFollowerInstances(ctx context.Context, userID primitive.ObjectID) ([]string, error) {
	return nil, nil
}
func (m *mockRelationshipsRepo) GetRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollow, error) {
	return nil, nil
}
func (m *mockRelationshipsRepo) GetRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollower, error) {
	return nil, nil
}
func (m *mockRelationshipsRepo) CountRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) (int64, error) {
	return 0, nil
}
func (m *mockRelationshipsRepo) CountRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) (int64, error) {
	return 0, nil
}

type mockUserRepo struct {
	findByUsernameFunc func(ctx context.Context, username string) (*identityModels.User, error)
}

func (m *mockUserRepo) FindByUsername(ctx context.Context, username string) (*identityModels.User, error) {
	if m.findByUsernameFunc != nil {
		return m.findByUsernameFunc(ctx, username)
	}
	return nil, nil
}
func (m *mockUserRepo) FindByID(ctx context.Context, id primitive.ObjectID) (*identityModels.User, error) {
	return nil, nil
}

// --- Tests ---

// TestDiscoverInstance verifies the instance discovery logic
func TestDiscoverInstance(t *testing.T) {
	ctx := context.Background()

	// Case 1: Instance already exists in the database
	t.Run("AlreadyExists", func(t *testing.T) {
		existingInstance := &models.Instance{Domain: "exists.com"}

		mockRepo := &mockInstanceRepo{
			getInstanceByDomainFunc: func(ctx context.Context, domain string) (*models.Instance, error) {
				if domain == "exists.com" {
					return existingInstance, nil // Found
				}
				return nil, errors.New("not found")
			},
		}

		service := &FederationService{
			instanceRepo: mockRepo,
		}

		result, err := service.DiscoverInstance(ctx, "exists.com")
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if result != existingInstance {
			t.Errorf("Expected instance %v, got %v", existingInstance, result)
		}
	})

	// Case 2: Instance is new and needs to be discovered via HTTP
	t.Run("NewInstance_Success", func(t *testing.T) {
		mockRepo := &mockInstanceRepo{
			getInstanceByDomainFunc: func(ctx context.Context, domain string) (*models.Instance, error) {
				return nil, errors.New("not found") // Not found in DB
			},
			upsertInstanceFunc: func(ctx context.Context, instance *models.Instance) error {
				return nil // Success
			},
		}

		mockClient := &mockHTTPClient{
			getFunc: func(url string) (*http.Response, error) {
				// Mock instance info response
				info := map[string]interface{}{
					"instance":   "new.com",
					"federation": true,
					"inbox":      "/inbox",
					"version":    "1.0",
				}
				body, _ := json.Marshal(info)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(bytes.NewReader(body)),
				}, nil
			},
		}

		service := &FederationService{
			instanceRepo: mockRepo,
			httpClient:   mockClient,
		}

		result, err := service.DiscoverInstance(ctx, "new.com")
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if result.Domain != "new.com" {
			t.Errorf("Expected domain new.com, got %s", result.Domain)
		}
		if result.InboxURL != "http://new.com/inbox" { // Assuming no localhost mapping logic applied for "new.com"
			t.Errorf("Expected inbox URL http://new.com/inbox, got %s", result.InboxURL)
		}
	})

	// Case 3: Instance exists but federation is disabled
	t.Run("NewInstance_FederationDisabled", func(t *testing.T) {
		mockRepo := &mockInstanceRepo{
			getInstanceByDomainFunc: func(ctx context.Context, domain string) (*models.Instance, error) {
				return nil, errors.New("not found")
			},
		}

		mockClient := &mockHTTPClient{
			getFunc: func(url string) (*http.Response, error) {
				info := map[string]interface{}{
					"instance":   "no-fed.com",
					"federation": false,
				}
				body, _ := json.Marshal(info)
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(bytes.NewReader(body)),
				}, nil
			},
		}

		service := &FederationService{
			instanceRepo: mockRepo,
			httpClient:   mockClient,
		}

		_, err := service.DiscoverInstance(ctx, "no-fed.com")
		if err == nil {
			t.Fatal("Expected error due to disabled federation, got nil")
		}
		if err.Error() != "instance does not support federation" {
			t.Errorf("Unexpected error message: %v", err)
		}
	})
}

// TestValidateActivity ensures that activity envelopes are correctly validated
func TestValidateActivity(t *testing.T) {
	service := &FederationService{}

	// Table-driven tests for various validation scenarios
	tests := []struct {
		name     string
		envelope *models.ActivityEnvelope
		wantErr  bool
	}{
		{
			name: "Valid",
			envelope: &models.ActivityEnvelope{
				Type:   "CreatePost",
				Actor:  "actor",
				Origin: "origin",
				Object: map[string]interface{}{"foo": "bar"},
			},
			wantErr: false,
		},
		{
			name: "Missing Type",
			envelope: &models.ActivityEnvelope{
				Actor:  "actor",
				Origin: "origin",
				Object: map[string]interface{}{"foo": "bar"},
			},
			wantErr: true,
		},
		{
			name: "Missing Object",
			envelope: &models.ActivityEnvelope{
				Type:   "CreatePost",
				Actor:  "actor",
				Origin: "origin",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateActivity(tt.envelope)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateActivity() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestHandleCreatePost verifies the handling of incoming CreatePost activities
func TestHandleCreatePost(t *testing.T) {
	ctx := context.Background()

	// Case: Valid CreatePost activity
	t.Run("Success", func(t *testing.T) {
		mockRemoteUserRepo := &mockRemoteUserRepo{
			upsertRemoteUserFunc: func(ctx context.Context, remoteUser *models.RemoteUser) error {
				return nil
			},
		}
		mockRemotePostRepo := &mockRemotePostRepo{
			upsertRemotePostFunc: func(ctx context.Context, remotePost *models.RemotePost) error {
				if remotePost.Content != "hello" {
					return errors.New("wrong content")
				}
				return nil
			},
		}

		service := &FederationService{
			remoteUserRepo: mockRemoteUserRepo,
			remotePostRepo: mockRemotePostRepo,
		}

		envelope := &models.ActivityEnvelope{
			Type:   "CreatePost",
			Origin: "other.com",
			Object: map[string]interface{}{
				"id":         "post123",
				"content":    "hello",
				"author":     "john",
				"author_id":  "john_actor_id",
				"created_at": time.Now().Format(time.RFC3339),
			},
		}

		err := service.HandleCreatePost(ctx, envelope)
		if err != nil {
			t.Fatalf("HandleCreatePost failed: %v", err)
		}
	})
}

// TestHandleFollow verifies the handling of incoming Follow activities
func TestHandleFollow(t *testing.T) {
	ctx := context.Background()

	// Case: Valid Follow activity
	t.Run("Success", func(t *testing.T) {
		localUser := &identityModels.User{
			ID:       primitive.NewObjectID(),
			Username: "alice",
		}

		mockUserRepo := &mockUserRepo{
			findByUsernameFunc: func(ctx context.Context, username string) (*identityModels.User, error) {
				if username == "alice" {
					return localUser, nil
				}
				return nil, errors.New("not found")
			},
		}

		mockRemoteUserRepo := &mockRemoteUserRepo{
			upsertRemoteUserFunc: func(ctx context.Context, remoteUser *models.RemoteUser) error {
				return nil
			},
		}

		mockRelationshipsRepo := &mockRelationshipsRepo{
			addRemoteFollowerFunc: func(ctx context.Context, follower *models.RemoteFollower) error {
				if follower.LocalUserID != localUser.ID {
					return errors.New("wrong local user id")
				}
				return nil
			},
		}

		service := &FederationService{
			userRepo:          mockUserRepo,
			remoteUserRepo:    mockRemoteUserRepo,
			relationshipsRepo: mockRelationshipsRepo,
		}

		envelope := &models.ActivityEnvelope{
			Type:   "Follow",
			Origin: "other.com",
			Object: map[string]interface{}{
				"follower_id":  "http://other.com/users/bob",
				"following_id": "http://myserver.com/users/alice",
			},
		}

		err := service.HandleFollow(ctx, envelope)
		if err != nil {
			t.Fatalf("HandleFollow failed: %v", err)
		}
	})
}
