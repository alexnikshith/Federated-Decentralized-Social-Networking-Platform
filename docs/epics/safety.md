# Safety Epic

## Overview
The Safety Epic focuses on providing users with tools to manage their interactions and protect themselves from unwanted content or harassment. It mainly handles the blocking mechanism between users.

## Key Models

### Block (`backend/epics/safety/models/block.go`)
Represents a user-initiated block against another user.
- **Fields**: `blocker_id`, `blocked_id`, `created_at`
- **Direction**: From blocker to blocked.

## Features

1.  **Block Management**
    -   Users can block other users to prevent them from interacting (messaging, following, etc.).
    -   Blocks are unidirectional: If user A blocks user B, user B cannot interact with user A.
    -   Blocks are stored with timestamps for tracking (`created_at`).

2.  **Interaction Restrictions**
    -   Blocked users cannot follow the blocker.
    -   Blocked users cannot send messages to the blocker (implied).

## Future Enhancements
-   Muting (hide content without blocking).
-   Advanced content filtering based on keywords.
-   Automated moderation rules.

## API Endpoints (Summary)
-   `POST /safety/block`: Block a user.
-   `DELETE /safety/block/:userId`: Unblock a user.
-   `GET /safety/blocks`: List blocked users.
