package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"federated-social/backend/config"
	"federated-social/backend/epics/federation/models"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// --- Mocks ---

type mockFederationService struct {
	handleIncomingActivityFunc func(ctx context.Context, envelope *models.ActivityEnvelope) error
	getTrustedInstancesFunc    func(ctx context.Context) ([]models.Instance, error)
	resolveRemoteUserFunc      func(ctx context.Context, handle string) (*models.RemoteUser, error)
	followRemoteUserFunc       func(ctx context.Context, localUserID primitive.ObjectID, remoteUser *models.RemoteUser) error
	removeRemoteFollowFunc     func(ctx context.Context, localUserID primitive.ObjectID, actorID, username, instance string) error
}

func (m *mockFederationService) HandleIncomingActivity(ctx context.Context, envelope *models.ActivityEnvelope) error {
	if m.handleIncomingActivityFunc != nil {
		return m.handleIncomingActivityFunc(ctx, envelope)
	}
	return nil
}

func (m *mockFederationService) GetTrustedInstances(ctx context.Context) ([]models.Instance, error) {
	if m.getTrustedInstancesFunc != nil {
		return m.getTrustedInstancesFunc(ctx)
	}
	return nil, nil
}

func (m *mockFederationService) ResolveRemoteUser(ctx context.Context, handle string) (*models.RemoteUser, error) {
	if m.resolveRemoteUserFunc != nil {
		return m.resolveRemoteUserFunc(ctx, handle)
	}
	return nil, nil
}

func (m *mockFederationService) FollowRemoteUser(ctx context.Context, localUserID primitive.ObjectID, remoteUser *models.RemoteUser) error {
	if m.followRemoteUserFunc != nil {
		return m.followRemoteUserFunc(ctx, localUserID, remoteUser)
	}
	return nil
}

func (m *mockFederationService) RemoveRemoteFollow(ctx context.Context, localUserID primitive.ObjectID, actorID, username, instance string) error {
	if m.removeRemoteFollowFunc != nil {
		return m.removeRemoteFollowFunc(ctx, localUserID, actorID, username, instance)
	}
	return nil
}

// --- Tests ---

func TestGetInstanceInfo(t *testing.T) {
	// Setup config
	config.AppConfig = &config.Config{
		InstanceName:   "Test Instance",
		InstanceDomain: "test.com",
	}

	handler := NewFederationHandler(&mockFederationService{})

	req, err := http.NewRequest("GET", "/.well-known/instance-info", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler.GetInstanceInfo(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}

	if response["instance"] != "Test Instance" {
		t.Errorf("expected instance name 'Test Instance', got %v", response["instance"])
	}
	if response["federation"] != true {
		t.Errorf("expected federation to be true")
	}
}

func TestReceiveActivity(t *testing.T) {
	mockService := &mockFederationService{
		handleIncomingActivityFunc: func(ctx context.Context, envelope *models.ActivityEnvelope) error {
			return nil
		},
	}

	handler := NewFederationHandler(mockService)

	envelope := models.ActivityEnvelope{
		Type:   "CreatePost",
		Actor:  "actor",
		Origin: "origin",
	}
	body, _ := json.Marshal(envelope)
	req, err := http.NewRequest("POST", "/federation/inbox", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler.ReceiveActivity(rr, req)

	// Should return 202 Accepted
	if status := rr.Code; status != http.StatusAccepted {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusAccepted)
	}
}

func TestGetTrustedInstances(t *testing.T) {
	config.AppConfig = &config.Config{
		InstanceName:   "Test Instance",
		InstanceDomain: "test.com",
	}

	mockService := &mockFederationService{
		getTrustedInstancesFunc: func(ctx context.Context) ([]models.Instance, error) {
			return []models.Instance{
				{Domain: "trusted.com", TrustLevel: "trusted"},
			}, nil
		},
	}

	handler := NewFederationHandler(mockService)
	req, err := http.NewRequest("GET", "/api/federation/instances", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler.GetTrustedInstances(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var response []map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}

	// Should contain local + 1 trusted
	if len(response) != 2 {
		t.Errorf("expected 2 instances, got %d", len(response))
	}
}

func TestResolveUser_Error(t *testing.T) {
	mockService := &mockFederationService{
		resolveRemoteUserFunc: func(ctx context.Context, handle string) (*models.RemoteUser, error) {
			return nil, errors.New("resolution failed")
		},
	}

	handler := NewFederationHandler(mockService)

	body := map[string]string{"handle": "unknown@domain.com"}
	jsonBody, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", "/api/federation/users/resolve", bytes.NewBuffer(jsonBody))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler.ResolveUser(rr, req)

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusInternalServerError)
	}
}
