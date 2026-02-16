# Reports Epic

## Overview
The Reports Epic encompasses both user activity reporting (analytics) and moderation reporting (flagging users/content). It provides insights into platform usage and helps maintain community standards.

## Key Models

### DailyActivity / ActivityReport (`backend/epics/reports/models/model.go`)
Aggregates user activity metrics over time.
- **Fields**: `user_id`, `date`, `minutes` (time spent).
- **Report**: Summed up `total_hours` and broken-down `daily_stats`.

### DailyInteraction / InteractionReport (`backend/epics/reports/models/model.go`)
Tracks the volume of user interactions.
- **Fields**: `date`, `likes`, `comments`, `follows`, `posts`.
- **Report**: Summarized `total_likes`, `total_posts`, etc., plus daily breakdown.

### UserReport (`backend/epics/reports/models/model.go`)
Mechanism for users to report other users or content for violations.
- **Fields**: `reporter_id`, `reported_id` (the user being reported), `reason`, `description`.
- **Status**: `status` ("pending", "reviewed", "actioned").
- **Extended**: `UserReportResponse` includes details of the reported user (`username`, `display_name`).

### FederationStats (`backend/epics/reports/models/model.go`)
Provides high-level statistics about federation connectivity.
- **Fields**: `inbound_count`, `outbound_count`, `servers` list.

## Features

1.  **Usage Analytics**
    -   Tracks daily active minutes per user.
    -   Generates weekly/monthly activity reports.

2.  **Interaction Analytics**
    -   Monitors engagement levels (likes, comments, etc.).
    -   Provides insights into platform growth and user behavior.

3.  **Moderation Reporting**
    -   Users can report other users for specific reasons (e.g., spam, harassment).
    -   Reports are stored with a status workflow for admin review.
    -   Includes descriptive text (`description`) for context.

4.  **System Health (Federation)**
    -   Tracks incoming and outgoing federation traffic.
    -   Lists connected servers for network health monitoring.

## API Endpoints (Summary)
-   `GET /reports/activity`: Get user activity stats.
-   `GET /reports/interactions`: Get interaction stats.
-   `POST /reports/users`: Report a user.
-   `GET /admin/reports`: (Admin) View all user reports.
