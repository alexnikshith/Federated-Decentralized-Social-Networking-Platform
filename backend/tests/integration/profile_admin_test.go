package integration

import (
	"context"
	contentDto "federated-social/backend/epics/content-sharing/dto"
	contentService "federated-social/backend/epics/content-sharing/service"
	identityDto "federated-social/backend/epics/identity/dto"
	identityRepo "federated-social/backend/epics/identity/repository"
	identityService "federated-social/backend/epics/identity/service"
	reportRepo "federated-social/backend/epics/reports/repository"
	reportService "federated-social/backend/epics/reports/service"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson"
)

func TestProfileVisibility_Integration(t *testing.T) {
	ctx := context.Background()

	// --- Setup Services ---
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)
	profileService := identityService.NewProfileService()
	followService := contentService.NewFollowService()

	// --- Step 1: Create two Users ---
	userA, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "user_a",
		Email:    "a@visibility.com",
		Password: "SecurePassword123!",
	})
	// Update bio
	bioStr := "Secret Bio"
	profileService.UpdateProfile(ctx, userA.ID, identityDto.UpdateProfileRequest{Bio: &bioStr})
	userB, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "user_b",
		Email:    "b@visibility.com",
		Password: "SecurePassword123!",
	})

	// --- Step 2: Public Check ---
	// User B views User A (who is public by default)
	profile, err := profileService.GetProfile(ctx, userA.ID, &userB.ID)
	assert.NoError(t, err)
	assert.True(t, profile.CanViewDetails, "Public profile should be fully visible")
	assert.Equal(t, "Secret Bio", profile.Bio)

	// --- Step 3: Followers-Only Check ---
	// User A changes visibility to "followers"
	vis := "followers"
	_, err = profileService.UpdateProfile(ctx, userA.ID, identityDto.UpdateProfileRequest{
		ProfileVisibility: &vis,
	})
	assert.NoError(t, err)

	// User B (stranger) views User A
	profile, err = profileService.GetProfile(ctx, userA.ID, &userB.ID)
	assert.NoError(t, err)
	assert.False(t, profile.CanViewDetails, "Followers-only profile should HIDE details from strangers")
	// Bio should still be in the struct but CanViewDetails is the flag the UI uses to mask it

	// --- Step 4: Follower Check ---
	// User B follows User A
	err = followService.Follow(ctx, userB.ID, userA.ID)
	assert.NoError(t, err)

	// User B (follower) views User A
	profile, err = profileService.GetProfile(ctx, userA.ID, &userB.ID)
	assert.NoError(t, err)
	assert.True(t, profile.CanViewDetails, "Followers-only profile should be VISIBLE to followers")
	assert.Equal(t, "Secret Bio", profile.Bio)
}

func TestAccountDeletion_Integration(t *testing.T) {
	ctx := context.Background()
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)
	profileService := identityService.NewProfileService()
	pService := contentService.NewPostService()

	// 1. Create User
	user, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "delete_tester",
		Email:    "delete@test.com",
		Password: "Password123!",
	})

	// 2. Create some data (Post)
	post, _ := pService.CreatePost(ctx, user.ID, contentDto.CreatePostRequest{Content: "Final Post"})

	// 3. Delete Account
	err := profileService.DeleteAccount(ctx, user.ID)
	assert.NoError(t, err)

	// 4. Verify user record is gone
	uRepo := identityRepo.NewUserRepository()
	_, err = uRepo.FindByID(ctx, user.ID)
	assert.Error(t, err, "User record should be deleted")

	// 5. Verify post is gone
	_, err = pService.GetPostByID(ctx, post.ID, user.ID)
	assert.Error(t, err, "Post should be deleted with account")

	// 6. Verify traffic record log (deletion tracking)
	rRepo := reportRepo.NewReportRepository()
	report, _ := rRepo.GetTrafficReport(ctx, time.Now().AddDate(0, 0, -1), time.Now().AddDate(0, 0, 1))
	foundDeletion := false
	for _, day := range report.DailyStats {
		if day.DeletedUsers > 0 {
			foundDeletion = true
		}
	}
	assert.True(t, foundDeletion, "Audit log for deletion should exist")
}

func TestAdminRoleUpgrade_Integration(t *testing.T) {
	ctx := context.Background()
	authService := identityService.NewAuthServiceWithDependencies(
		identityRepo.NewUserRepository(),
		identityRepo.NewSessionRepository(),
		identityRepo.NewActivityRepository(),
		identityRepo.NewVerificationRepository(),
		&mockEmailSender{},
	)
	rService := reportService.NewReportService(reportRepo.NewReportRepository())

	// 1. Create User
	user, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "future_admin",
		Email:    "admin@upgrade.com",
		Password: "Password123!",
	})
	assert.Equal(t, "user", user.Role)

	// 2. Manually upgrade to admin via repository (simulating manual entry or specialized admin command)
	uRepo := identityRepo.NewUserRepository()
	err := uRepo.UpdateUser(ctx, user.ID, bson.M{"role": "admin"})
	assert.NoError(t, err)

	// 3. Verify role change
	updatedUser, _ := uRepo.FindByID(ctx, user.ID)
	assert.Equal(t, "admin", updatedUser.Role)

	// 4. Simulate Admin action - Create a report first to ensure non-empty list
	reporter, _ := authService.Signup(ctx, identityDto.SignupRequest{
		Username: "reporter_man",
		Email:    "rep@test.com",
		Password: "Password123!",
	})
	rService.SubmitUserReport(ctx, reporter.ID.Hex(), reportService.SubmitReportRequest{
		ReportedID:  user.ID.Hex(),
		Reason:      "test",
		Description: "test",
	})

	reports, err := rService.GetAdminReports(ctx)
	assert.NoError(t, err)
	assert.NotEmpty(t, reports)
}
