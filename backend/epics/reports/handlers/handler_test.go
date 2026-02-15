package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"federated-social/backend/epics/reports/models"
	"federated-social/backend/epics/reports/service"
	"federated-social/backend/middleware"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestHeartbeat(t *testing.T) {
	userID := primitive.NewObjectID().Hex()

	tests := []struct {
		name           string
		userID         string
		mockService    func(*MockReportService)
		expectedStatus int
	}{
		{
			name:   "Success",
			userID: userID,
			mockService: func(m *MockReportService) {
				m.RecordActivityFunc = func(ctx context.Context, uid string) error {
					if uid != userID {
						return errors.New("user ID mismatch")
					}
					return nil
				}
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "Service Failure",
			userID: userID,
			mockService: func(m *MockReportService) {
				m.RecordActivityFunc = func(ctx context.Context, uid string) error {
					return errors.New("db error")
				}
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockReportService{}
			tt.mockService(mockSvc)
			handler := &ReportHandler{Service: mockSvc}

			req := httptest.NewRequest("POST", "/api/reports/heartbeat", nil)
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, tt.userID)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			handler.Heartbeat(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestGetReport(t *testing.T) {
	userID := primitive.NewObjectID().Hex()

	tests := []struct {
		name           string
		userID         string
		queryParams    map[string]string
		mockService    func(*MockReportService)
		expectedStatus int
	}{
		{
			name:        "Success",
			userID:      userID,
			queryParams: map[string]string{"start_date": "2023-01-01", "end_date": "2023-01-07"},
			mockService: func(m *MockReportService) {
				m.GetUserActivityReportFunc = func(ctx context.Context, uid, startStr, endStr string) (*models.ActivityReport, error) {
					return &models.ActivityReport{TotalHours: 10}, nil
				}
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "Service Error",
			userID: userID,
			mockService: func(m *MockReportService) {
				m.GetUserActivityReportFunc = func(ctx context.Context, uid, startStr, endStr string) (*models.ActivityReport, error) {
					return nil, errors.New("service error")
				}
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockReportService{}
			tt.mockService(mockSvc)
			handler := &ReportHandler{Service: mockSvc}

			req := httptest.NewRequest("GET", "/api/reports/activity", nil)
			q := req.URL.Query()
			for k, v := range tt.queryParams {
				q.Add(k, v)
			}
			req.URL.RawQuery = q.Encode()

			ctx := context.WithValue(req.Context(), middleware.UserIDKey, tt.userID)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			handler.GetReport(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestSubmitUserReport(t *testing.T) {
	userID := primitive.NewObjectID().Hex()
	reportedID := primitive.NewObjectID().Hex()

	tests := []struct {
		name           string
		userID         string
		payload        interface{}
		mockService    func(*MockReportService)
		expectedStatus int
	}{
		{
			name:   "Success",
			userID: userID,
			payload: service.SubmitReportRequest{
				ReportedID:  reportedID,
				Reason:      "Spam",
				Description: "Spamming messages",
			},
			mockService: func(m *MockReportService) {
				m.SubmitUserReportFunc = func(ctx context.Context, reporterID string, req service.SubmitReportRequest) error {
					return nil
				}
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name:    "Invalid Payload",
			userID:  userID,
			payload: "invalid-json",
			mockService: func(m *MockReportService) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "Self Report Error",
			userID: userID,
			payload: service.SubmitReportRequest{
				ReportedID: userID,
			},
			mockService: func(m *MockReportService) {
				m.SubmitUserReportFunc = func(ctx context.Context, reporterID string, req service.SubmitReportRequest) error {
					return errors.New("cannot report yourself")
				}
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "Invalid Reported ID Error",
			userID: userID,
			payload: service.SubmitReportRequest{
				ReportedID: "invalid-hex",
			},
			mockService: func(m *MockReportService) {
				m.SubmitUserReportFunc = func(ctx context.Context, reporterID string, req service.SubmitReportRequest) error {
					return errors.New("invalid reported user ID")
				}
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockReportService{}
			tt.mockService(mockSvc)
			handler := &ReportHandler{Service: mockSvc}

			var body []byte
			if s, ok := tt.payload.(string); ok && s == "invalid-json" {
				body = []byte("invalid-json")
			} else {
				body, _ = json.Marshal(tt.payload)
			}

			req := httptest.NewRequest("POST", "/api/reports/submit", bytes.NewBuffer(body))
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, tt.userID)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			handler.SubmitUserReport(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestGetAdminReports(t *testing.T) {
	tests := []struct {
		name           string
		mockService    func(*MockReportService)
		expectedStatus int
	}{
		{
			name: "Success",
			mockService: func(m *MockReportService) {
				m.GetAdminReportsFunc = func(ctx context.Context) ([]models.UserReportResponse, error) {
					return []models.UserReportResponse{}, nil
				}
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Service Error",
			mockService: func(m *MockReportService) {
				m.GetAdminReportsFunc = func(ctx context.Context) ([]models.UserReportResponse, error) {
					return nil, errors.New("db error")
				}
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockReportService{}
			tt.mockService(mockSvc)
			handler := &ReportHandler{Service: mockSvc}

			req := httptest.NewRequest("GET", "/api/reports/admin/all", nil)
			// Admin auth is handled by middleware, we are testing logic after middleware here
			w := httptest.NewRecorder()
			handler.GetAdminReports(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestGetInteractionReport(t *testing.T) {
	userID := primitive.NewObjectID().Hex()

	tests := []struct {
		name           string
		userID         string
		mockService    func(*MockReportService)
		expectedStatus int
	}{
		{
			name:   "Success",
			userID: userID,
			mockService: func(m *MockReportService) {
				m.GetInteractionReportFunc = func(ctx context.Context, uid, startStr, endStr string) (*models.InteractionReport, error) {
					return &models.InteractionReport{TotalLikes: 5}, nil
				}
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "Service Error",
			userID: userID,
			mockService: func(m *MockReportService) {
				m.GetInteractionReportFunc = func(ctx context.Context, uid, startStr, endStr string) (*models.InteractionReport, error) {
					return nil, errors.New("service error")
				}
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockReportService{}
			tt.mockService(mockSvc)
			handler := &ReportHandler{Service: mockSvc}

			req := httptest.NewRequest("GET", "/api/reports/interactions/received", nil)
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, tt.userID)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			handler.GetInteractionReport(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestGetInteractionMadeReport(t *testing.T) {
	userID := primitive.NewObjectID().Hex()

	tests := []struct {
		name           string
		userID         string
		mockService    func(*MockReportService)
		expectedStatus int
	}{
		{
			name:   "Success",
			userID: userID,
			mockService: func(m *MockReportService) {
				m.GetInteractionMadeReportFunc = func(ctx context.Context, uid, startStr, endStr string) (*models.InteractionReport, error) {
					return &models.InteractionReport{TotalLikes: 10}, nil
				}
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "Service Error",
			userID: userID,
			mockService: func(m *MockReportService) {
				m.GetInteractionMadeReportFunc = func(ctx context.Context, uid, startStr, endStr string) (*models.InteractionReport, error) {
					return nil, errors.New("service error")
				}
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockReportService{}
			tt.mockService(mockSvc)
			handler := &ReportHandler{Service: mockSvc}

			req := httptest.NewRequest("GET", "/api/reports/interactions/made", nil)
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, tt.userID)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			handler.GetInteractionMadeReport(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

// Helper to create timestamp
func now() time.Time {
	return time.Now().UTC()
}
