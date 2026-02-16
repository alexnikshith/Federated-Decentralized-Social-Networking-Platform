# API Flow

## Overview
The platform exposes three categories of APIs: Client APIs (for the React frontend), Federation APIs (for inter-instance communication), and Admin APIs (for platform management).

## 1. Client Authentication Flow
1.  **Signup/Login**: 
    -   User submits credentials to `/auth/signup` or `/auth/login`.
    -   `IdentityService` validates/creates the user and issues a JWT.
2.  **Authenticated Requests**:
    -   Client includes `Authorization: Bearer <token>` in headers.
    -   `AuthMiddleware` validates the token and injects the `UserID` into the context.
3.  **Profile Retrieval**:
    -   Client calls `/users/me` for private data or `/users/:username` for public data.
    -   `IdentityService` applies privacy filters based on `ProfileVisibility`.

## 2. Content Sharing Flow
1.  **Post Creation**:
    -   User calls `POST /posts`.
    -   `PostService` saves to MongoDB and queues a `FederationEvent`.
2.  **Feed Aggregation**:
    -   User calls `GET /feed`.
    -   `PostService` merges local posts from followed users and cached `RemotePosts`.

## 3. Federation Flow (Inbound)
1.  **Activity Receipt**:
    -   Remote instance sends POST to `/federation/inbox`.
    -   `FederationHandler` validates the sender's domain against the `instances` (trusted) collection.
2.  **Processing**:
    -   New users are cached in `remote_users`.
    -   New content is cached in `remote_posts`.
    -   Notifications are generated for local users if mentioned or interacted with.

## 4. Federation Flow (Outbound)
1.  **Queueing**:
    -   Actions (Like, Post, Follow) create a `FederationEvent` with status `pending`.
2.  **Background Worker**:
    -   `FederationWorker` polls for pending events.
    -   Attempts delivery to the `InboxURL` of the target instance.
    -   Updates status to `sent` or increments `retry_count` on failure.

## 5. Security & Error Handling
-   **Validation**: All inputs are validated via DTOs before reaching services.
-   **Middleware**: Panic recovery, Logging, and Auth middleware wrap all routes.
-   **Status Codes**:
    -   `200/201`: Success
    -   `401`: Unauthorized (Invalid Token)
    -   `403`: Forbidden (Trust issues or Privacy restrictions)
    -   `404`: Not Found
    -   `500`: Internal Server Error
