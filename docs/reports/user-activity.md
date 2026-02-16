# User Activity Reports

## Overview
User activity reports track time spent and frequency of use by individuals on the platform. This helps in identifying active user segments and platform usage patterns.

## Tracked Metrics
-   **Minutes Active**: The total time a user spends on the platform, aggregated daily.
-   **Total Hours**: A calculated field representing the total time spent over a specific reporting period.

## Data Model
Activity is tracked via the `DailyActivity` model:
-   `UserID`: Reference to the user being tracked.
-   `Date`: The specific day of activity.
-   `Minutes`: Quantity of active time recorded for that day.

## Report Types
1.  **Individual Activity Report**: Shows a specific user's activity history (`ActivityReport`).
2.  **Aggregated Active Users**: (Admin only) Identifies high-activity users for community moderation and engagement.

## API Access
-   `GET /reports/activity`: Returns the `ActivityReport` for the authenticated user.
-   `GET /reports/activity/:userId`: (Admin only) Returns activity stats for a specific user.
