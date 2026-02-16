# Content Sharing Epic

## Overview
The Content Sharing Epic is the core interactive component of the platform, enabling users to create posts, share media, adhere to community guidelines, and interact with other users' content.

## Key Models

### Post (`backend/epics/content-sharing/models/post.go`)
Central entity for user-generated content.
- **Fields**: `content`, `media_url` (image/video), `status` ("active", "under_review", "deleted").
- **Stats**: `like_count`, `comment_count`.
- **Mentions**: `mentioned_usernames`.

### Comment (`backend/epics/content-sharing/models/post.go`)
Represents a user's reply to a post or another comment.
- **Fields**: `content`, `parent_id` (nested comments).
- **Relationships**: `post_id`, `user_id`.

### Like (`backend/epics/content-sharing/models/post.go`)
Represents a user's positive reaction.
- **Fields**: `post_id`, `user_id`.
- **One-to-many**: Multiple likes per post, one per user.

### Follow (`backend/epics/content-sharing/models/post.go`)
Directional relationship between two users.
- **Fields**: `follower_id` -> `following_id`.

### Notification (`backend/epics/content-sharing/models/post.go`)
Alert mechanism for user interactions.
- **Types**: "like", "comment", "follow", "mention".
- **Fields**: `is_read`, `related_entity_id`.

### SavedPost (`backend/epics/content-sharing/models/post.go`)
Allows users to bookmark posts for later viewing.
- **Fields**: `user_id`, `post_id`.

### PostInteraction (`backend/epics/content-sharing/models/post.go`)
Tracks user sentiment for recommendations.
- **Types**: "interested", "not_interested".

## Features

1.  **Post Management**
    -   Create text and media-based posts.
    -   Edit and delete own posts.
    -   Mention other users using `@username`.

2.  **Interactions**
    -   Like/Unlike posts.
    -   Comment threads (including replies).
    -   Share posts (Future implementation).
    -   Save posts for later.

3.  **Social Graph**
    -   Follow other users to see their content in the feed.
    -   View followers and following lists.

4.  **Notifications**
    -   Real-time alerts for interactions on posts.
    -   New follower notifications.
    -   Unread status tracking.

5.  **User Sentiment**
    -   Express "interested" or "not interested" on posts to tune the feed algorithm.

## API Endpoints (Summary)
-   `POST /posts`: Create a post.
-   `GET /posts`: Get feed.
-   `GET /posts/:id`: Get a specific post.
-   `POST /posts/:id/like`: Like a post.
-   `POST /posts/:id/comment`: Add a comment.
-   `POST /users/:id/follow`: Follow a user.
