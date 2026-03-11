package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	contentModels "federated-social/backend/epics/content-sharing/models"
	identityModels "federated-social/backend/epics/identity/models"
	reportModels "federated-social/backend/epics/reports/models"
	reportService "federated-social/backend/epics/reports/service"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestGetTraffic(t *testing.T) {
	mockReportRepo := &MockReportsRepository{
		GetTrafficReportFunc: func(ctx context.Context, start, end time.Time) (*reportModels.TrafficReport, error) {
			return &reportModels.TrafficReport{
				DailyStats: []reportModels.DailyTraffic{
					{Users: 10, Posts: 5},
				},
			}, nil
		},
	}

	h := &AdminHandler{
		reportService: NewMockReportService(mockReportRepo),
	}

	req := httptest.NewRequest("GET", "/api/admin/traffic?start_date=2024-01-01&end_date=2024-01-07", nil)
	w := httptest.NewRecorder()

	h.GetTraffic(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp reportModels.TrafficReport
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp.DailyStats) != 1 || resp.DailyStats[0].Users != 10 {
		t.Errorf("Unexpected response content: %+v", resp)
	}
}

func TestToggleUserStatus(t *testing.T) {
	userID := primitive.NewObjectID()

	tests := []struct {
		name           string
		payload        interface{}
		mockUserRepo   func(*MockUserRepository)
		expectedStatus int
	}{
		{
			name: "Success - Activate",
			payload: map[string]interface{}{
				"user_id":   userID.Hex(),
				"is_active": true,
			},
			mockUserRepo: func(m *MockUserRepository) {
				m.UpdateUserFunc = func(ctx context.Context, id primitive.ObjectID, update bson.M) error {
					if id != userID {
						t.Errorf("Expected user ID %v, got %v", userID, id)
					}
					if update["is_active"] != true || update["is_deactivated"] != false {
						t.Errorf("Unexpected update: %v", update)
					}
					return nil
				}
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Success - Deactivate",
			payload: map[string]interface{}{
				"user_id":   userID.Hex(),
				"is_active": false,
				"reason":    "Violation",
			},
			mockUserRepo: func(m *MockUserRepository) {
				m.FindByIDFunc = func(ctx context.Context, id primitive.ObjectID) (*identityModels.User, error) {
					return &identityModels.User{ID: userID, Email: "test@example.com", Username: "testuser"}, nil
				}
				m.UpdateUserFunc = func(ctx context.Context, id primitive.ObjectID, update bson.M) error {
					if update["is_active"] != false || update["is_deactivated"] != true {
						t.Errorf("Unexpected update: %v", update)
					}
					return nil
				}
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mUser := &MockUserRepository{}
			if tt.mockUserRepo != nil {
				tt.mockUserRepo(mUser)
			}
			mSession := &MockSessionRepository{
				InvalidateAllUserSessionsFunc: func(ctx context.Context, id primitive.ObjectID) error {
					return nil
				},
			}

			h := &AdminHandler{
				userRepo:    mUser,
				sessionRepo: mSession,
				emailSender: &MockEmailSender{},
			}

			body, _ := json.Marshal(tt.payload)
			req := httptest.NewRequest("POST", "/api/admin/users/status", bytes.NewBuffer(body))
			w := httptest.NewRecorder()

			h.ToggleUserStatus(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestResolveReport(t *testing.T) {
	reportID := primitive.NewObjectID()
	postID := primitive.NewObjectID()

	mockPostRepo := &MockPostRepository{
		GetReportByIDFunc: func(ctx context.Context, id primitive.ObjectID) (*contentModels.ReportedPost, error) {
			return &contentModels.ReportedPost{ID: reportID, PostID: postID}, nil
		},
		UpdatePostStatusFunc: func(ctx context.Context, id primitive.ObjectID, status string) error {
			if id != postID || status != "active" {
				t.Errorf("Unexpected UpdatePostStatus call: %v, %s", id, status)
			}
			return nil
		},
		DeleteReportFunc: func(ctx context.Context, id primitive.ObjectID) error {
			if id != reportID {
				t.Errorf("Unexpected DeleteReport call: %v", id)
			}
			return nil
		},
	}

	h := &AdminHandler{
		postRepo: mockPostRepo,
	}

	req := httptest.NewRequest("DELETE", "/api/admin/reports/resolve?id="+reportID.Hex(), nil)
	w := httptest.NewRecorder()

	h.ResolveReport(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

// Helper to create a fake report service for testing
type mockReportService struct {
	repo reportService.ReportRepository // Wait, this should use the interface from service package
}

func NewMockReportService(repo reportService.ReportRepository) reportService.ReportService {
	return reportService.NewReportService(repo)
}
