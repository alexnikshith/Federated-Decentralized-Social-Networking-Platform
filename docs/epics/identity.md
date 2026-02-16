# Identity Epic

## Overview
The Identity Epic handles all user-related functionality, including registration, authentication, profile management, and account settings. It serves as the foundation for user interaction within the platform.

## Key Models

### User (`backend/epics/identity/models/user.go`)
Represents a registered user account.
- **Core Fields**: `_id`, `username`, `email`, `password_hash`, `display_name`
- **Profile Details**: `bio`, `avatar_url`
- **Privacy**: `profile_visibility` ("public" or "followers")
- **Status**: `is_active`, `is_deactivated`, `is_2fa_enabled`, `is_discoverable`
- **Role**: `role` ("user" or "admin")
- **Federation**: `instance_id` (home instance), `joined_communities` (other instances joined)

### Session (`backend/epics/identity/models/user.go`)
Represents an active user session.
- **Fields**: `_id`, `user_id`, `token`, `expires_at`, `is_valid`

### ActivityLog (`backend/epics/identity/models/user.go`)
Tracks user actions for security and auditing.
- **Fields**: `action`, `details`, `ip_address`, `user_agent`, `timestamp`

## Features

1.  **User Registration & Authentication**
    -   Users can sign up with a unique username and email.
    -   Secure password hashing using Bcrypt.
    -   Session-based authentication with JWT tokens.
    -   Two-Factor Authentication (2FA) support.

2.  **Profile Management**
    -   Users can update their display name, bio, and avatar.
    -   Users can view their own profile (private view) and others' profiles (public view).

3.  **Privacy & Discovery**
    -   **Profile Visibility**: Users can set their profile to be visible to everyone or only followers.
    -   **Discoverability**: Users can opt-in/out of global directories via `is_discoverable`.

4.  **Account Control**
    -   **Deactivation**: Users can deactivate their account, hiding it from others.
    -   **Activation**: Accounts are activated upon verification (if applicable).

5.  **Federation Support**
    -   Users are associated with a home `instance_id`.
    -   Users can join multiple communities across federated instances (`joined_communities`).

## API Endpoints (Summary)
-   `POST /auth/signup`: Register a new user.
-   `POST /auth/login`: Authenticate and receive a token.
-   `GET /users/me`: Get current user's profile.
-   `PUT /users/me`: Update profile details.
-   `POST /users/me/deactivate`: Deactivate account.
