# Epic 2: Content Sharing - Testing Checklist

## Pre-Testing Checklist

### 1. Environment Setup
- [ ] Verify all files are saved
- [ ] Confirm workspace is clean (no uncommitted changes in critical files)
- [ ] Backend environment variables configured (if needed)
- [ ] MongoDB is running/accessible
- [ ] Frontend environment variables configured (if needed)

### 2. Backend Verification
- [ ] `go mod tidy` - dependencies are clean
- [ ] `go build` - backend compiles without errors
- [ ] Verify all content-sharing handlers exist
  - [ ] `post_handler.go`
  - [ ] `follow_handler.go`
  - [ ] `notification_handler.go`
  - [ ] `search_handler.go`
- [ ] Verify all content-sharing services exist
  - [ ] `post_service.go`
  - [ ] `follow_service.go`
  - [ ] `notification_service.go`
  - [ ] `search_service.go`
- [ ] Verify all content-sharing models exist
  - [ ] `post.go`
- [ ] Verify all content-sharing repositories exist
  - [ ] `post_repository.go`
  - [ ] `follow_repository.go`
  - [ ] `notification_repository.go`
  - [ ] `search_repository.go`

### 3. Frontend Verification
- [ ] `npm install` or `npm ci` - dependencies are clean
- [ ] `npm run build` - frontend compiles without errors
- [ ] Verify all content-sharing components exist
  - [ ] `PostCard.tsx`
  - [ ] `CreatePost.tsx`
  - [ ] `CommentList.tsx`
  - [ ] `NotificationList.tsx`
  - [ ] `FollowButton.tsx`
  - [ ] `UserSearch.tsx`
- [ ] Verify content-sharing pages exist
  - [ ] `FeedPage.tsx`
- [ ] Verify content-sharing store exists
  - [ ] `contentStore.ts`

### 4. Database Verification
- [ ] MongoDB is accessible from backend
- [ ] Collections can be created (permissions verified)
- [ ] No corrupted indexes

---

## Test Execution Phase

### 5. Backend Unit Tests
- [ ] Run `go test ./... -v` for content-sharing handlers
- [ ] Run `go test ./... -v` for content-sharing services
- [ ] Run `go test ./... -v` for content-sharing repositories
- [ ] Verify all tests pass
- [ ] Check test coverage metrics

### 6. Frontend Unit Tests
- [ ] Setup testing framework (Jest/Vitest if not present)
- [ ] Run `npm test` (if tests exist)
- [ ] Verify component tests pass
- [ ] Verify store tests pass

### 7. Integration Tests (Manual API Testing)

#### Post Creation
- [ ] [ POST ] `/api/posts` - Create a new post
  - [ ] Valid request succeeds with 201 status
  - [ ] Missing fields return 400 error
  - [ ] Unauthorized request returns 401 error

#### Post Retrieval
- [ ] [ GET ] `/api/feed` - Get user's feed
  - [ ] Returns 200 with posts list
  - [ ] Pagination works correctly
  - [ ] Chronological ordering is correct

#### Post Deletion
- [ ] [ DELETE ] `/api/posts/{id}` - Delete own post
  - [ ] Owner can delete own post
  - [ ] Non-owner cannot delete post (403 error)
  - [ ] Non-existent post returns 404 error

#### Follow Operations
- [ ] [ POST ] `/api/users/{id}/follow` - Follow user
- [ ] [ DELETE ] `/api/users/{id}/follow` - Unfollow user
- [ ] [ GET ] `/api/users/{id}/followers` - Get followers list

#### Notification Operations
- [ ] [ GET ] `/api/notifications` - Get user notifications
- [ ] [ PUT ] `/api/notifications/{id}` - Mark notification as read

#### Search Operations
- [ ] [ GET ] `/api/search?q={query}` - Search posts/users

### 8. Code Quality Checks
- [ ] Backend: `go fmt ./...` - all files properly formatted
- [ ] Backend: `go vet ./...` - no issues detected
- [ ] Frontend: `npm run lint` - no linting errors
- [ ] No unused imports or variables
- [ ] Code follows project conventions

### 9. Performance Checks
- [ ] API response times are acceptable (< 500ms)
- [ ] No memory leaks in long-running operations
- [ ] Database queries are optimized

### 10. Security Checks
- [ ] JWT tokens are validated
- [ ] Only authenticated users can perform operations
- [ ] Users cannot modify other users' posts
- [ ] Sensitive data is not exposed in API responses

---

## Post-Testing Verification

### 11. Test Results Documentation
- [ ] All tests passed or issues documented
- [ ] Screenshots/logs captured for failures
- [ ] Performance metrics recorded
- [ ] Security findings documented

### 12. Build & Deployment Readiness
- [ ] No breaking changes introduced
- [ ] All dependencies are satisfied
- [ ] Docker build succeeds (if applicable)
- [ ] No compiler warnings (if possible)

---

## Known Issues & Notes
- Add any known issues or test failures here
- Document any skipped tests with reasons

---

## Sign-off

- **Tester:** ________________
- **Date:** ________________
- **Status:** [ ] PASS [ ] FAIL [ ] CONDITIONAL
- **Notes:** ________________________

---
