package integration

import (
	"context"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/identity/service"
	"testing"

	"github.com/stretchr/testify/assert"
)

type mockEmailSender struct{}

func (m *mockEmailSender) SendVerificationEmail(to string, code string) error  { return nil }
func (m *mockEmailSender) SendPasswordResetEmail(to string, code string) error { return nil }

func TestAuthFlow_Integration(t *testing.T) {
	ctx := context.Background()

	// Initialize real repositories that will talk to the test MongoDB
	userRepo := repository.NewUserRepository()
	sessionRepo := repository.NewSessionRepository()
	activityRepo := repository.NewActivityRepository()
	verificationRepo := repository.NewVerificationRepository()
	emailSender := &mockEmailSender{}

	// Inject real repos but mock email (to avoid needing a real SMTP server)
	authService := service.NewAuthServiceWithDependencies(
		userRepo,
		sessionRepo,
		activityRepo,
		verificationRepo,
		emailSender,
	)

	// --- Step 1: User Signup ---
	signupReq := dto.SignupRequest{
		Username: "integration_tester",
		Email:    "tester@integration.com",
		Password: "SecurePassword123!",
	}

	user, err := authService.Signup(ctx, signupReq)
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, "integration_tester", user.Username)

	// Verify user is actually in the database
	dbUser, err := userRepo.FindByEmail(ctx, "tester@integration.com")
	assert.NoError(t, err)
	assert.Equal(t, user.ID, dbUser.ID)

	// --- Step 2: Initiate Login ---
	loginReq := dto.LoginRequest{
		Email:    "tester@integration.com",
		Password: "SecurePassword123!",
	}

	resp, err := authService.InitiateLogin(ctx, loginReq, "127.0.0.1", "integration-test-agent")
	assert.NoError(t, err)

	// Signup sets 2FA to true by default, so we expect a string message
	msg, ok := resp.(string)
	assert.True(t, ok, "Expected string response for 2FA initiation")
	assert.Contains(t, msg, "Verification code sent")

	// --- Step 3: Retrieve OTP from Database ---
	// In a real scenario, the user would check their email.
	// In integration testing, we check the DB directly to "simulate" getting the email.
	storedCode, err := verificationRepo.FindLatestByUserID(ctx, user.ID)
	assert.NoError(t, err)
	assert.NotEmpty(t, storedCode.Code)

	// --- Step 4: Verify OTP and Get JWT ---
	verifyReq := dto.VerifyOTPRequest{
		Email: "tester@integration.com",
		Code:  storedCode.Code,
	}

	loginResp, err := authService.VerifyOTP(ctx, verifyReq, "127.0.0.1", "integration-test-agent")
	assert.NoError(t, err)
	assert.NotEmpty(t, loginResp.Token)

	// --- Step 5: Validate Session Persistence ---
	session, err := sessionRepo.FindSessionByToken(ctx, loginResp.Token)
	assert.NoError(t, err)
	assert.Equal(t, user.ID, session.UserID)
}
