# Epic 1: Identity - Testing Checklist

## Pre-Testing Setup

### 1. Start Services
```bash
# Option 1: Using Docker (Recommended)
docker-compose up

# Option 2: Local Development
# Terminal 1 - MongoDB
docker run -d -p 27017:27017 mongo:7.0

# Terminal 2 - Backend
cd backend
go run main.go

# Terminal 3 - Frontend
cd frontend
npm run dev
```

### 2. Access Points
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- MongoDB: localhost:27017

---

## US1.1: Account Creation

### Test Cases

#### ✅ TC1.1.1: Valid Signup
- [ ] Navigate to signup page
- [ ] Enter valid username (e.g., "testuser")
- [ ] Enter valid email (e.g., "test@example.com")
- [ ] Enter valid password (min 8 chars)
- [ ] Enter matching confirm password
- [ ] Click "Sign Up"
- [ ] **Expected:** Account created, auto-login, redirect to dashboard

#### ✅ TC1.1.2: Duplicate Username
- [ ] Try to signup with existing username
- [ ] **Expected:** Error message "username already taken"

#### ✅ TC1.1.3: Duplicate Email
- [ ] Try to signup with existing email
- [ ] **Expected:** Error message "email already registered"

#### ✅ TC1.1.4: Invalid Password
- [ ] Enter password less than 8 characters
- [ ] **Expected:** Error message "Password must be at least 8 characters"

#### ✅ TC1.1.5: Password Mismatch
- [ ] Enter different passwords in password and confirm fields
- [ ] **Expected:** Error message "Passwords do not match"

---

## US1.2: Secure Login

### Test Cases

#### ✅ TC1.2.1: Valid Login
- [ ] Navigate to login page
- [ ] Enter valid email
- [ ] Enter correct password
- [ ] Click "Sign In"
- [ ] **Expected:** Login successful, redirect to dashboard

#### ✅ TC1.2.2: Invalid Credentials
- [ ] Enter valid email
- [ ] Enter wrong password
- [ ] **Expected:** Error message "invalid credentials"

#### ✅ TC1.2.3: Non-existent User
- [ ] Enter email that doesn't exist
- [ ] **Expected:** Error message "invalid credentials"

#### ✅ TC1.2.4: Deactivated Account
- [ ] Login with deactivated account
- [ ] **Expected:** Error message "account is deactivated"

#### ✅ TC1.2.5: Token Persistence
- [ ] Login successfully
- [ ] Refresh page
- [ ] **Expected:** User remains logged in

---

## US1.3: Profile Editing

### Test Cases

#### ✅ TC1.3.1: Update Display Name
- [ ] Go to Profile page
- [ ] Change display name
- [ ] Click "Update Profile"
- [ ] **Expected:** Success message, name updated in UI

#### ✅ TC1.3.2: Update Bio
- [ ] Enter bio text (multi-line)
- [ ] Click "Update Profile"
- [ ] **Expected:** Bio saved and displayed

#### ✅ TC1.3.3: Update Avatar URL
- [ ] Enter valid image URL
- [ ] Click "Update Profile"
- [ ] **Expected:** Avatar URL saved

#### ✅ TC1.3.4: Change Visibility
- [ ] Toggle between "Public" and "Followers Only"
- [ ] Click "Update Profile"
- [ ] **Expected:** Visibility setting saved

#### ✅ TC1.3.5: Empty Update
- [ ] Don't change any fields
- [ ] Click "Update Profile"
- [ ] **Expected:** Error or no-op

---

## US1.4: Privacy Controls

### Test Cases

#### ✅ TC1.4.1: Public Profile Access
- [ ] Set profile to "Public"
- [ ] Logout
- [ ] Try to access profile via direct URL
- [ ] **Expected:** Profile visible without login

#### ✅ TC1.4.2: Private Profile Access (Unauthorized)
- [ ] Set profile to "Followers Only"
- [ ] Logout
- [ ] Try to access profile via direct URL
- [ ] **Expected:** Error "profile is private"

#### ✅ TC1.4.3: Private Profile Access (Owner)
- [ ] Set profile to "Followers Only"
- [ ] View own profile while logged in
- [ ] **Expected:** Profile visible to owner

---

## US1.5: Account Deactivation

### Test Cases

#### ✅ TC1.5.1: Deactivate Account
- [ ] Go to Profile > Danger Zone
- [ ] Click "Deactivate Account"
- [ ] Confirm in dialog
- [ ] **Expected:** Account deactivated, redirect to login

#### ✅ TC1.5.2: Login After Deactivation
- [ ] Try to login with deactivated account
- [ ] **Expected:** Error "account is deactivated"

#### ✅ TC1.5.3: Profile Hidden After Deactivation
- [ ] Try to access deactivated user's profile
- [ ] **Expected:** Error "account is deactivated"

---

## US1.6: Password Change

### Test Cases

#### ✅ TC1.6.1: Valid Password Change
- [ ] Go to Profile > Security tab
- [ ] Enter current password
- [ ] Enter new password (min 8 chars)
- [ ] Enter matching confirm password
- [ ] Click "Change Password"
- [ ] **Expected:** Success message, auto-logout after 2 seconds

#### ✅ TC1.6.2: Wrong Old Password
- [ ] Enter incorrect current password
- [ ] **Expected:** Error "old password is incorrect"

#### ✅ TC1.6.3: New Password Too Short
- [ ] Enter password less than 8 characters
- [ ] **Expected:** Error message or HTML5 validation

#### ✅ TC1.6.4: Password Mismatch
- [ ] Enter different new passwords
- [ ] **Expected:** Error "Passwords do not match"

#### ✅ TC1.6.5: Login with New Password
- [ ] After password change, login with new password
- [ ] **Expected:** Login successful

#### ✅ TC1.6.6: Old Token Invalid
- [ ] Save old token before password change
- [ ] Try to use old token after change
- [ ] **Expected:** Token invalid, 401 error

---

## US1.7: Activity Logs

### Test Cases

#### ✅ TC1.7.1: View Activity
- [ ] Go to Profile > Activity tab
- [ ] **Expected:** List of recent activities displayed

#### ✅ TC1.7.2: Signup Activity
- [ ] Check for "SIGNUP" activity after account creation
- [ ] **Expected:** Signup event with timestamp

#### ✅ TC1.7.3: Login Activity
- [ ] Login and check activity
- [ ] **Expected:** Login event with IP and user agent

#### ✅ TC1.7.4: Profile Update Activity
- [ ] Update profile and check activity
- [ ] **Expected:** Profile update event logged

#### ✅ TC1.7.5: Password Change Activity
- [ ] Change password and check activity
- [ ] **Expected:** Password change event logged

#### ✅ TC1.7.6: Activity Sorting
- [ ] Check if activities are sorted by timestamp (newest first)
- [ ] **Expected:** Most recent activity at top

---

## US1.8: Secure Logout

### Test Cases

#### ✅ TC1.8.1: Logout
- [ ] Click logout button
- [ ] **Expected:** Redirect to login page

#### ✅ TC1.8.2: Token Invalidated
- [ ] Save token before logout
- [ ] Logout
- [ ] Try to use saved token for API call
- [ ] **Expected:** 401 Unauthorized error

#### ✅ TC1.8.3: Cannot Access Protected Routes
- [ ] Logout
- [ ] Try to access /dashboard or /profile
- [ ] **Expected:** Redirect to login

#### ✅ TC1.8.4: Logout Activity Logged
- [ ] Logout and login again
- [ ] Check activity logs
- [ ] **Expected:** Logout event present

---

## API Testing (Using curl or Postman)

### Signup
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "apitest",
    "email": "api@test.com",
    "password": "password123",
    "display_name": "API Test"
  }'
```
- [ ] **Expected:** 201 Created, user object returned

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api@test.com",
    "password": "password123"
  }'
```
- [ ] **Expected:** 200 OK, token and user returned
- [ ] Save token for next tests

### Get Profile
```bash
curl http://localhost:8080/api/profile/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] **Expected:** 200 OK, user profile returned

### Update Profile
```bash
curl -X PUT http://localhost:8080/api/profile/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "display_name": "Updated Name",
    "bio": "Test bio"
  }'
```
- [ ] **Expected:** 200 OK, updated profile returned

### Get Activity
```bash
curl http://localhost:8080/api/profile/me/activity?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] **Expected:** 200 OK, array of activities

### Change Password
```bash
curl -X POST http://localhost:8080/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "old_password": "password123",
    "new_password": "newpassword456"
  }'
```
- [ ] **Expected:** 200 OK, success message

### Logout
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] **Expected:** 200 OK, success message

### Deactivate Account
```bash
curl -X POST http://localhost:8080/api/profile/me/deactivate \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] **Expected:** 200 OK, success message

---

## Integration Testing

### Full User Journey
1. [ ] Signup new account
2. [ ] Auto-login after signup
3. [ ] View dashboard
4. [ ] Navigate to profile
5. [ ] Update profile information
6. [ ] Change profile visibility
7. [ ] View activity logs
8. [ ] Change password
9. [ ] Login with new password
10. [ ] Logout
11. [ ] Login again
12. [ ] Deactivate account
13. [ ] Verify cannot login

---

## Security Testing

### Authentication
- [ ] Try to access protected routes without token
- [ ] Try to use expired token
- [ ] Try to use invalid token
- [ ] Try to use token after logout

### Authorization
- [ ] Try to access another user's private profile
- [ ] Try to update another user's profile
- [ ] Try to view another user's activity

### Input Validation
- [ ] Try SQL injection in username
- [ ] Try XSS in bio field
- [ ] Try very long inputs
- [ ] Try special characters

---

## Performance Testing

### Load Testing
- [ ] Create 100 users
- [ ] Login with 10 concurrent users
- [ ] Update profiles simultaneously
- [ ] Check response times

### Database
- [ ] Verify unique indexes work
- [ ] Check query performance
- [ ] Verify session cleanup

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet

---

## Responsive Design

### Screen Sizes
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## Error Handling

### Network Errors
- [ ] Stop backend, try to login
- [ ] **Expected:** Appropriate error message

### Database Errors
- [ ] Stop MongoDB, try to signup
- [ ] **Expected:** Server error, graceful handling

### Validation Errors
- [ ] Submit empty forms
- [ ] **Expected:** Validation messages

---

## Documentation Testing

### README
- [ ] Follow quick start guide
- [ ] Verify all commands work
- [ ] Check links are valid

### API Documentation
- [ ] Test all curl examples
- [ ] Verify endpoint descriptions
- [ ] Check response formats

---

## Deployment Testing

### Docker
- [ ] `docker-compose up` works
- [ ] All services start correctly
- [ ] Services can communicate
- [ ] Volumes persist data

### Environment Variables
- [ ] Test with different JWT_SECRET
- [ ] Test with different ports
- [ ] Test with different MongoDB URI

---

## Test Results Summary

| User Story | Test Cases | Passed | Failed | Notes |
|------------|-----------|--------|--------|-------|
| US1.1      |           |        |        |       |
| US1.2      |           |        |        |       |
| US1.3      |           |        |        |       |
| US1.4      |           |        |        |       |
| US1.5      |           |        |        |       |
| US1.6      |           |        |        |       |
| US1.7      |           |        |        |       |
| US1.8      |           |        |        |       |

---

## Issues Found

### Critical
- [ ] None

### Major
- [ ] None

### Minor
- [ ] None

### Enhancement Requests
- [ ] None

---

## Sign-off

- [ ] All test cases passed
- [ ] No critical issues
- [ ] Documentation verified
- [ ] Ready for production

**Tested By:** ___________________  
**Date:** ___________________  
**Signature:** ___________________

---

**Epic 1: Identity - Testing Complete** ✅
