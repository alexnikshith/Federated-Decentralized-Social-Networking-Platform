# Unit Testing Strategy: Content Sharing Epic

## 1. Overview
This document outlines the unit testing strategy for the Content Sharing epic. All tests are located within the `epics/identity/tests` folder as per requirements.

## 2. Test Structure
- **Frontend**: `frontend/epics/identity/tests/content-sharing/`
  - `mocks.ts`: Global mocks for Zustand and Axios.
  - `CreatePost.test.tsx`: Tests for post creation logic.
  - `PostCard.test.tsx`: Tests for post display, likes, and deletion visibility.
  - `SearchAndFollow.test.tsx`: Tests for user search and follow button interactions.
  - `Notifications.test.tsx`: Tests for notification list rendering.
- **Backend**: `backend/epics/identity/tests/content-sharing/`
  - `mocks_test.go`: Interface-based repository mocks using `testify/mock`.
  - `post_service_test.go`: Table-driven tests for service logic.

## 3. Mocking Strategy
- **Frontend**:
  - `vi.mock` used to intercept `axios` calls and return mock data.
  - Zustand stores are mocked via `getState` override to isolate component logic.
- **Backend**:
  - `PostService` refactored to use `PostRepositoryInterface`.
  - Dependency injection via `NewPostServiceWithDeps` allows injecting `MockPostRepository`.

## 4. User Stories Tested
| User Story | Frontend Test | Backend Test |
|------------|---------------|--------------|
| Create Post | `CreatePost.test.tsx` | `post_service_test.go` |
| Like Post | `PostCard.test.tsx` | `post_service_test.go` |
| Delete Post | `PostCard.test.tsx` | `post_service_test.go` |
| Comment Post | `CommentList` (logic in Card/Store) | Implicit in Service |
| Follow User | `SearchAndFollow.test.tsx` | `search_follow_test.go` |
| View Post | `PostCard.test.tsx` | `post_service_test.go` |
| Search Users | `SearchAndFollow.test.tsx` | Implicit in Service |
| Get Notifications| `Notifications.test.tsx` | Implicit in Service |

## 5. Execution Commands
- **Run all tests and generate reports**:
  ```powershell
  .\run_content_sharing_tests.ps1
  ```
- **Frontend only**: `npm run test` (inside frontend)
- **Backend only**: `go test ./epics/identity/tests/content-sharing/...` (inside backend)

## 6. CI-Ready Reporting
Reports are generated in the `content-sharing_test_reports` folder in tabular `.txt` format.
