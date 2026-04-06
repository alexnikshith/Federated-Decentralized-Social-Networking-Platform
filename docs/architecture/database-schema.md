# DATABASE SCHEMA (MongoDB)

## Federated Decentralized Social Networking Platform

# 1. Overview

The system uses **MongoDB** as a document-oriented database.

Each instance is self-contained and stores:

* Local users
* Local posts
* Federation metadata
* Moderation records
* Messaging data

Although MongoDB is schema-less, we define a **logical schema design** to ensure:

* Data consistency
* Referential clarity
* Clean API contracts
* Maintainability

Below is the conceptual schema represented using a Mermaid ER diagram.

---

# 2. Schema Diagram

```mermaid
erDiagram

    %% ========================
    %% Identity
    %% ========================

    User ||--o{ Session : has
    User ||--o{ ActivityLog : logs

    User {
        ObjectID _id
        string username
        string email
        string password_hash
        string display_name
        string bio
        string avatar_url
        string profile_visibility
        boolean is_active
        boolean is_deactivated
        boolean is_2fa_enabled
        boolean is_discoverable
        string role
        string instance_id
        timestamp created_at
        timestamp updated_at
    }

    Session {
        ObjectID _id
        ObjectID user_id
        string token
        timestamp expires_at
        boolean is_valid
    }

    ActivityLog {
        ObjectID _id
        ObjectID user_id
        string action
        string details
        string ip_address
        timestamp timestamp
    }

    %% ========================
    %% Content
    %% ========================

    User ||--o{ Post : creates
    User ||--o{ Comment : writes
    User ||--o{ Like : likes
    User ||--o{ Follow : follows

    Post ||--o{ Comment : has
    Post ||--o{ Like : has

    Post {
        ObjectID _id
        ObjectID author_id
        string content
        string media_url
        string media_type
        int like_count
        int comment_count
        string status
        timestamp created_at
        timestamp updated_at
    }

    Comment {
        ObjectID _id
        ObjectID post_id
        ObjectID user_id
        string content
        ObjectID parent_id
        timestamp created_at
    }

    Like {
        ObjectID _id
        ObjectID post_id
        ObjectID user_id
        timestamp created_at
    }

    Follow {
        ObjectID _id
        ObjectID follower_id
        ObjectID following_id
        timestamp created_at
    }

    %% ========================
    %% Federation
    %% ========================

    Instance ||--o{ RemoteUser : hosts
    Instance ||--o{ RemotePost : originates

    Instance {
        ObjectID _id
        string domain
        string inbox_url
        string trust_level
        timestamp created_at
        timestamp updated_at
    }

    RemoteUser {
        ObjectID _id
        string actor_id
        string username
        string display_name
        string instance
        timestamp fetched_at
    }

    RemotePost {
        ObjectID _id
        string remote_post_id
        string origin_instance
        string content
        string visibility
        int like_count
        int comment_count
        timestamp received_at
    }

    %% ========================
    %% Safety
    %% ========================

    User ||--o{ Block : blocks
    User ||--o{ UserReport : reports

    Block {
        ObjectID _id
        ObjectID blocker_id
        ObjectID blocked_id
        timestamp created_at
    }

    UserReport {
        ObjectID _id
        ObjectID reporter_id
        ObjectID reported_id
        string reason
        string status
        timestamp created_at
    }

    %% ========================
    %% Messaging
    %% ========================

    User ||--o{ Conversation : participates
    Conversation ||--o{ Message : contains

    Conversation {
        ObjectID _id
        ObjectID[] participants
        timestamp updated_at
        timestamp created_at
    }

    Message {
        ObjectID _id
        ObjectID conversation_id
        ObjectID sender_id
        string content
        string type
        timestamp created_at
    }
```

---

# 3. Collection Descriptions

## Identity Collections

### users

Stores core user data including authentication, privacy settings, and profile metadata.

### sessions

Stores active login sessions and tokens.

### activity_logs

Stores audit information for security and monitoring.

---

## Content Collections

### posts

Stores user-generated content.

### comments

Stores comments on posts.

### likes

Tracks post likes.

### follows

Tracks local follow relationships.

---

## Federation Collections

### instances

Stores metadata about federated servers.

### remote_users

Caches remote profiles.

### remote_posts

Caches posts from external instances.

---

## Safety Collections

### blocks

Tracks user blocking relationships.

### user_reports

Tracks user-to-user reports.

---

## Messaging Collections

### conversations

Represents chat threads.

### messages

Stores individual messages in conversations.

---

# 4. Design Rationale

This schema design supports:

* Instance autonomy
* Federation through cached remote objects
* Soft relationship references via ObjectIDs
* Scalable document storage
* Efficient read-heavy social workloads

MongoDB was chosen because:

* It handles flexible document structures
* Federation payloads (ActivityPub JSON) map naturally to BSON
* It supports horizontal scaling

---

# 5. Key Architectural Decisions

* Relationships are maintained using ObjectID references
* Counters like like_count are denormalized for performance
* Remote objects are cached locally for federation efficiency
* Soft-deletion is supported via status fields
* Messaging uses embedded conversation references

---

# 6. Why This Schema Fits a Federated Platform

* Each instance stores only its local data
* Remote data is cached, not owned
* Federation events are stored asynchronously
* Moderation and safety are instance-scoped

This aligns with decentralized governance and digital sovereignty principles.
