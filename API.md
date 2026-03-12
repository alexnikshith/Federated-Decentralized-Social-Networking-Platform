# Federate Social API Documentation

This document provides an overview of the REST API endpoints available in the Federated Social platform.

## 🔒 Authentication & Headers

Most protected endpoints require a JWT token passed in the `Authorization` header:
`Authorization: Bearer <your_token>`

---
### Public Endpoints
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Authenticate and receive a JWT token
- `POST /api/auth/verify-otp` - Verify email using One-Time Password
- `POST /api/auth/check-email` - Check if an email is already registered
- `POST /api/auth/check-username` - Check if a username is available
- `POST /api/auth/forgot-password` - Request password reset code
- `POST /api/auth/verify-reset-code` - Verify password reset code
- `POST /api/auth/reset-password` - Set a new password
- `POST /api/auth/upload-avatar` - Upload a custom profile picture

### Protected Endpoints (Requires Auth)
- `POST /api/auth/logout` - Invalidate current session
- `POST /api/auth/change-password` - Update password while logged in
- `POST /api/auth/2fa` - Toggle Two-Factor Authentication
- `GET /api/auth/me` - Get current authenticated user details
- `GET /api/profile/me` - Get current user's full profile
- `PUT /api/profile/me` - Update profile information
- `DELETE /api/profile/me` - Permanently delete account
- `POST /api/profile/me/deactivate` - Soft-deactivate account
- `GET /api/profile/me/activity` - Retrieve account activity logs

### Profile View
- `GET /api/profile/{id}` - View another user's profile (supports Optional Auth for follow status)

### Posts & Feed
- `POST /api/posts` - Create a new post
- `GET /api/feed` - Get personalized content feed
- `GET /api/posts/{id}` - Get a single post by ID
- `DELETE /api/posts/{id}` - Delete your own post
- `GET /api/users/{id}/posts` - Get posts from a specific user

### Interactions
- `POST /api/posts/{id}/like` - Like a post
- `DELETE /api/posts/{id}/like` - Unlike a post
- `POST /api/posts/{id}/comments` - Add a comment to a post
- `GET /api/posts/{id}/comments` - Get comments for a post
- `DELETE /api/comments/{id}` - Delete a comment
- `POST /api/posts/{id}/save` - Save post to bookmarks
- `GET /api/posts/saved` - Retrieve saved posts

### Stories
- `POST /api/stories` - Create a new story
- `GET /api/stories` - Get active stories from followed users
- `GET /api/stories/viewed` - Get list of IDs for seen stories
- `POST /api/stories/{id}/view` - Mark a story as viewed

### Social Graph
- `POST /api/users/{id}/follow` - Follow a local user
- `DELETE /api/users/{id}/unfollow` - Unfollow a local user
- `POST /api/follow` - Unified follow (supports `@user@domain` handles)
- `GET /api/users/{id}/followers` - Get followers list
- `GET /api/users/{id}/following` - Get following list

### User Features
- `POST /api/reports/user` - Report another user for violations
- `POST /api/posts/{id}/report` - Report a specific post
- `GET /api/reports/activity` - Get your own daily activity stats

### Admin Endpoints (Requires Admin Role)
- `GET /api/admin/stats` - Overall system health and growth stats
- `GET /api/admin/users` - List and search all users
- `POST /api/admin/users/status` - Activate/Deactivate a user account
- `POST /api/admin/users/role` - Update user role (User/Admin)
- `DELETE /api/admin/users` - Permanently delete any user account
- `DELETE /api/admin/posts` - Remove violating content
- `GET /api/admin/reports` - View all pending user/content reports
- `DELETE /api/admin/reports/resolve` - Dismiss or resolve a report
