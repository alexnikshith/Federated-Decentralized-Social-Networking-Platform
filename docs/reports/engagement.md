# Engagement Reports

## Overview
Engagement reports provide insights into how users interact with content and each other. These metrics are crucial for understanding platform growth and user retention.

## Tracked Metrics
-   **Total Likes**: Aggregate count of "like" interactions across all posts.
-   **Total Comments**: Total number of comments and replies generated.
-   **Total Follows**: Number of new follow relationships established.
-   **Total Posts**: Number of user-generated content items created.

## Data Model
Interactions are aggregated daily in the `DailyInteraction` model:
-   `Date`: The 24-hour period for the stats.
-   `Likes/Comments/Follows/Posts`: Integer counts for that specific day.

## Report Types
1.  **Summary Report**: Provides lifetime or period-based totals for all interaction types.
2.  **Trend Report**: A time-series breakdown showing daily activity levels (`DailyStats`).

## API Access
-   `GET /reports/interactions`: Returns an `InteractionReport` containing both totals and daily breakdowns.
