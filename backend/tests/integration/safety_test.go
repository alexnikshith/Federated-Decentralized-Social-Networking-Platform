package integration

import (
	"context"
	contentDto "federated-social/backend/epics/content-sharing/dto"
	contentModels "federated-social/backend/epics/content-sharing/models"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	contentService "federated-social/backend/epics/content-sharing/service"
	identityDto "federated-social/backend/epics/identity/dto"
	identityRepo "federated-social/backend/epics/identity/repository"
	identityService "federated-social/backend/epics/identity/service"
	reportRepo "federated-social/backend/epics/reports/repository"
	reportService "federated-social/backend/epics/reports/service"
	safetyRepo "federated-social/backend/epics/safety/repository"
	safetyService "federated-social/backend/epics/safety/service"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSafetyModeration_Integration(t *testing.T) {
	ctx := context.Background()

	// --- Setup Services ---
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)

	bService := safetyService.NewBlockService(safetyRepo.NewBlockRepository())
	pService := contentService.NewPostService()
	rRepo := reportRepo.NewReportRepository()
	rService := reportService.NewReportService(rRepo)

	// --- Step 1: Create three Users (Blocker, Blocked, Reporter) ---
	blocker, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "blocker_user",
		Email:    "blocker@test.com",
		Password: "SecurePassword123!",
	})
	blocked, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "blocked_user",
		Email:    "blocked@test.com",
		Password: "SecurePassword123!",
	})
	reporter, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "reporter_user",
		Email:    "reporter@test.com",
		Password: "SecurePassword123!",
	})

	// --- Step 2: Test Blocking Logic ---
	// 2.a: Blocked user creates a post
	post, _ := pService.CreatePost(ctx, blocked.ID, contentDto.CreatePostRequest{Content: "Post from blocked user"})

	// 2.b: Verify Blocker can see it initially in public feed
	feed, _ := pService.GetFeed(ctx, blocker.ID, 10, "public")
	found := false
	for _, p := range feed.Posts {
		if p.ID.Hex() == post.ID.Hex() {
			found = true
		}
	}
	assert.True(t, found, "Post should be visible before blocking")

	// 2.c: Blocker blocks Blocked
	err := bService.BlockUser(ctx, blocker.ID, blocked.ID)
	assert.NoError(t, err)

	// 2.d: Verify Blocker NO LONGER sees the post
	feed, _ = pService.GetFeed(ctx, blocker.ID, 10, "public")
	found = false
	for _, p := range feed.Posts {
		if p.ID.Hex() == post.ID.Hex() {
			found = true
		}
	}
	assert.False(t, found, "Post should NOT be visible after blocking")

	// --- Step 3: Test Reporting Logic ---
	// 3.a: Reporter reports a post
	pRepo := contentRepo.NewPostRepository()
	err = pRepo.CreateReport(ctx, &contentModels.ReportedPost{
		ReporterID: reporter.ID,
		PostID:     post.ID,
		Reason:     "offensive",
	})
	assert.NoError(t, err)

	// 3.b: Verify Post Status changed to 'under_review'
	updatedPost, _ := pRepo.GetPostByIDAdmin(ctx, post.ID)
	assert.Equal(t, "under_review", updatedPost.Status)

	// 3.c: Reporter reports a user
	submitReq := reportService.SubmitReportRequest{
		ReportedID:  blocked.ID.Hex(),
		Reason:      "spam",
		Description: "This user is spamming the network.",
	}
	err = rService.SubmitUserReport(ctx, reporter.ID.Hex(), submitReq)
	assert.NoError(t, err)

	// 3.d: Verify Admin can see the user report
	adminReports, err := rService.GetAdminReports(ctx)
	assert.NoError(t, err)
	assert.NotEmpty(t, adminReports)

	foundReport := false
	for _, r := range adminReports {
		if r.ReportedID == blocked.ID {
			foundReport = true
			assert.Equal(t, "spam", r.Reason)
		}
	}
	assert.True(t, foundReport)

	// --- Step 4: Test Auto-Deactivation (Triggering threshhold) ---
	// If 9+ reports occur, user should be deactivated (based on service logic)
	for i := 0; i < 9; i++ {
		_ = rService.SubmitUserReport(ctx, reporter.ID.Hex(), submitReq)
	}

	// Verify user is now deactivated
	uRepo := identityRepo.NewUserRepository()
	dbUser, _ := uRepo.FindByID(ctx, blocked.ID)
	assert.True(t, dbUser.IsDeactivated, "User should be auto-deactivated after 9 reports")
}
