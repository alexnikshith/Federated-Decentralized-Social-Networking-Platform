# Epic 1: Identity - Implementation Documentation

## Overview
This document provides comprehensive documentation for Epic 1: Identity implementation of the Federated Decentralized Social Networking Platform.

## User Stories Implemented

### ✅ US1.1: Account Creation
**User Story:** As a user, I want to create an account so that I can join a community of my choice.

**Implementation:**
- **Backend:** `POST /api/auth/signup`
- **Frontend:** `SignupPage.tsx`
- **Features:**
  - Unique username per instance
  - Email validation
  - Password hashing with bcrypt
  - Duplicate prevention with MongoDB unique indexes
  - Auto-login after successful signup

**Testing:**
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "display_name": "Test User"
  }'
```

---

### ✅ US1.2: Secure Login
**User Story:** As a user, I want to log in securely so that my account stays protected.

**Implementation:**
- **Backend:** `POST /api/auth/login`
- **Frontend:** `LoginPage.tsx`
- **Features:**
  - JWT token-based authentication
  - 24-hour session expiry
  - Password verification with bcrypt
  - Activity logging (IP address, user agent)
  - Deactivated account check

**Testing:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

### ✅ US1.3: Profile Editing
**User Story:** As a user, I want to edit my profile so that others can know about me.

**Implementation:**
- **Backend:** `PUT /api/profile/me`
- **Frontend:** `ProfilePage.tsx` (Profile tab)
- **Features:**
  - Editable fields: display_name, bio, avatar_url, profile_visibility
  - Real-time updates
  - Activity logging

**Testing:**
```bash
curl -X PUT http://localhost:8080/api/profile/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "display_name": "Updated Name",
    "bio": "This is my bio",
    "profile_visibility": "public"
  }'
```

---

### ✅ US1.4: Privacy Controls
**User Story:** As a user, I want to control who sees my profile so that my privacy is respected.

**Implementation:**
- **Backend:** `GET /api/profile/{id}`
- **Frontend:** Profile visibility settings
- **Features:**
  - Public / followers-only profile options
  - Visibility enforcement on profile fetch
  - Unauthorized access blocked with 403 error

**Testing:**
```bash
# Public profile (no auth required)
curl http://localhost:8080/api/profile/USER_ID

# Private profile (requires auth)
curl http://localhost:8080/api/profile/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### ✅ US1.5: Account Deactivation
**User Story:** As a user, I want to deactivate my account so that I can leave the platform safely.

**Implementation:**
- **Backend:** `POST /api/profile/me/deactivate`
- **Frontend:** `ProfilePage.tsx` (Danger Zone)
- **Features:**
  - Soft deactivation (data preserved)
  - Content hidden from public
  - Login blocked after deactivation
  - Confirmation dialog

**Testing:**
```bash
curl -X POST http://localhost:8080/api/profile/me/deactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### ✅ US1.6: Password Change
**User Story:** As a user, I want to change my password so that my account remains secure.

**Implementation:**
- **Backend:** `POST /api/auth/change-password`
- **Frontend:** `ProfilePage.tsx` (Security tab)
- **Features:**
  - Old password verification
  - Secure bcrypt hashing
  - All sessions invalidated after change
  - Auto-logout for security

**Testing:**
```bash
curl -X POST http://localhost:8080/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "old_password": "password123",
    "new_password": "newpassword456"
  }'
```

---

### ✅ US1.7: Activity Logs
**User Story:** As a user, I want to see my activity so that I understand my interactions.

**Implementation:**
- **Backend:** `GET /api/profile/me/activity?limit=50`
- **Frontend:** `ProfilePage.tsx` (Activity tab)
- **Features:**
  - Activity event storage (login, logout, profile_update, etc.)
  - Timestamp-based sorting (newest first)
  - IP address and user agent tracking
  - Configurable limit (default: 50)

**Testing:**
```bash
curl http://localhost:8080/api/profile/me/activity?limit=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### ✅ US1.8: Secure Logout
**User Story:** As a user, I want to log out so that my account is not misused.

**Implementation:**
- **Backend:** `POST /api/auth/logout`
- **Frontend:** Logout button in dashboard/profile
- **Features:**
  - Token invalidation in database
  - Session marked as invalid
  - Token unusable after logout
  - Activity logging

**Testing:**
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Architecture

### Backend Structure
```
backend/
├── config/           # Configuration management
├── database/         # MongoDB connection
├── middleware/       # Auth middleware, CORS, logging
├── identity/         # Identity epic module
│   ├── models/       # User, Session, ActivityLog models
│   ├── dto/          # Request/Response DTOs
│   ├── repository/   # Database operations
│   ├── service/      # Business logic
│   ├── handlers/     # HTTP handlers
│   └── routes/       # Route registration
└── main.go          # Server entry point
```

### Frontend Structure
```
frontend/
├── identity/         # Identity epic module
│   ├── types/        # TypeScript interfaces
│   ├── api/          # API client
│   ├── store/        # Zustand state management
│   └── pages/        # React components
└── src/
    ├── pages/        # Global pages (Dashboard)
    ├── App.tsx       # Main app with routing
    └── main.tsx      # Entry point
```

---

## Technology Stack

### Backend
- **Language:** Go 1.21
- **Framework:** net/http with gorilla/mux
- **Database:** MongoDB 7.0
- **Authentication:** JWT (golang-jwt/jwt/v5)
- **Password Hashing:** bcrypt (golang.org/x/crypto)
- **Environment:** godotenv

### Frontend
- **Framework:** React 18
- **Language:** TypeScript 5
- **Build Tool:** Vite 5
- **Routing:** React Router 6
- **State Management:** Zustand 4
- **HTTP Client:** Axios 1.6
- **Styling:** Vanilla CSS with modern design

---

## Security Features

1. **Password Security**
   - Bcrypt hashing with default cost (10)
   - Minimum 8 characters required
   - Never exposed in API responses

2. **JWT Tokens**
   - 24-hour expiration
   - Stored in localStorage (frontend)
   - Validated on every protected request
   - Invalidated on logout

3. **Session Management**
   - Database-backed sessions
   - Token invalidation support
   - Automatic cleanup of expired sessions

4. **Privacy Controls**
   - Profile visibility settings
   - Access control enforcement
   - Soft account deactivation

5. **Activity Tracking**
   - IP address logging
   - User agent tracking
   - Timestamp-based audit trail

---

## API Endpoints

### Public Endpoints
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Authenticate user
- `GET /api/profile/{id}` - View public profile (with visibility check)

### Protected Endpoints (Require JWT)
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/change-password` - Change password
- `GET /api/profile/me` - Get own profile
- `PUT /api/profile/me` - Update profile
- `POST /api/profile/me/deactivate` - Deactivate account
- `GET /api/profile/me/activity` - Get activity logs

### Health Check
- `GET /health` - Server health status

---

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password_hash: String,
  display_name: String,
  bio: String,
  avatar_url: String,
  profile_visibility: String ("public" | "followers"),
  is_active: Boolean,
  is_deactivated: Boolean,
  created_at: Date,
  updated_at: Date,
  instance_id: String
}
```

### Sessions Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  token: String,
  expires_at: Date,
  created_at: Date,
  is_valid: Boolean
}
```

### Activity Logs Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  action: String,
  details: String,
  ip_address: String,
  user_agent: String,
  timestamp: Date
}
```

---

## Design Decisions

1. **Layered Architecture**
   - Separation of concerns (Handler → Service → Repository)
   - Easy to test and maintain
   - Clear responsibility boundaries

2. **Epic-Based Module Structure**
   - Each epic is self-contained
   - Mirrors backend structure in frontend
   - Scalable for future epics

3. **JWT vs Sessions**
   - JWT for stateless authentication
   - Database sessions for token invalidation
   - Best of both worlds

4. **Soft Deletion**
   - Account deactivation preserves data
   - Allows for account recovery
   - Maintains data integrity

5. **Activity Logging**
   - Comprehensive audit trail
   - Security monitoring
   - User transparency

---

## Trade-offs & Limitations

### Current Limitations
1. **No Password Reset** - Requires email service (future enhancement)
2. **No 2FA** - Single-factor authentication only
3. **No Rate Limiting** - Vulnerable to brute force (add in production)
4. **No Email Verification** - Accounts active immediately
5. **Follower System Not Implemented** - "Followers only" visibility partially functional

### Trade-offs
1. **JWT in localStorage** - Vulnerable to XSS (consider httpOnly cookies)
2. **24-hour Token Expiry** - Balance between security and UX
3. **Soft Deletion** - Database bloat vs data preservation
4. **Activity Logging** - Storage cost vs audit trail

---

## Testing Guide

### Backend Testing
```bash
# 1. Start MongoDB
docker-compose up mongodb -d

# 2. Run backend
cd backend
go mod download
go run main.go

# 3. Test endpoints (see examples above)
```

### Frontend Testing
```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start dev server
npm run dev

# 3. Open browser
# Navigate to http://localhost:5173
```

### Integration Testing
```bash
# Start all services
docker-compose up

# Access:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8080
# - MongoDB: localhost:27017
```

---

## Future Enhancements

1. **Email Service Integration**
   - Email verification
   - Password reset
   - Activity notifications

2. **Enhanced Security**
   - Two-factor authentication
   - Rate limiting
   - CAPTCHA for signup/login

3. **Social Features**
   - Follow/unfollow users
   - Friend requests
   - Blocking users

4. **Profile Enhancements**
   - Profile pictures upload
   - Cover photos
   - Custom themes

5. **Advanced Privacy**
   - Granular privacy controls
   - Content visibility settings
   - Data export

---

## Conclusion

Epic 1: Identity has been successfully implemented with all 8 user stories completed. The system provides:

- ✅ Secure authentication and authorization
- ✅ Comprehensive profile management
- ✅ Privacy controls
- ✅ Activity tracking
- ✅ Account lifecycle management

The implementation follows best practices in security, architecture, and user experience, providing a solid foundation for future epics.
