# Database Schema (MongoDB)

## Overview
The system uses MongoDB as a document store. Each instance is self-contained. Below are the primary collections and their schemas.

---

## 1. Identity Epic (Users & Sessions)

### `users`
-   `_id`: ObjectID
-   `username`: String (Unique)
-   `email`: String (Unique)
-   `password_hash`: String
-   `display_name`: String
-   `bio`: String
-   `avatar_url`: String
-   `profile_visibility`: String ("public", "followers")
-   `is_active`: Boolean
-   `is_2fa_enabled`: Boolean
-   `role`: String ("user", "admin")
-   `instance_id`: String (Home instance domain)
-   `joined_communities`: Array<String>
-   `created_at`: Timestamp
-   `updated_at`: Timestamp

### `sessions`
-   `_id`: ObjectID
-   `user_id`: ObjectID
-   `token`: String
-   `expires_at`: Timestamp
-   `is_valid`: Boolean

---

## 2. Content Sharing Epic

### `posts`
-   `_id`: ObjectID
-   `author_id`: ObjectID
-   `content`: String
-   `media_url`: String
-   `media_type`: String
-   `like_count`: Integer
-   `comment_count`: Integer
-   `status`: String ("active", "under_review", "deleted")
-   `mentioned_usernames`: Array<String>
-   `created_at`: Timestamp

### `comments`
-   `_id`: ObjectID
-   `post_id`: ObjectID
-   `user_id`: ObjectID
-   `content`: String
-   `parent_id`: ObjectID (Nullable, for nesting)

### `follows`
-   `_id`: ObjectID
-   `follower_id`: ObjectID
-   `following_id`: ObjectID

---

## 3. Federation Epic

### `instances`
-   `_id`: ObjectID
-   `domain`: String
-   `inbox_url`: String
-   `trust_level`: String ("trusted", "limited", "blocked")
-   `last_seen_at`: Timestamp

### `remote_users` (Cached)
-   `actor_id`: String (Fully qualified ID)
-   `username`: String
-   `instance`: String
-   `fetched_at`: Timestamp

### `remote_posts` (Cached)
-   `remote_post_id`: String
-   `origin_instance`: String
-   `author`: String (user@domain)
-   `content`: String

---

## 4. Safety & Reports Epic

### `blocks`
-   `blocker_id`: ObjectID
-   `blocked_id`: ObjectID

### `user_reports`
-   `reporter_id`: ObjectID
-   `reported_id`: ObjectID
-   `reason`: String
-   `status`: String ("pending", "reviewed", "actioned")
