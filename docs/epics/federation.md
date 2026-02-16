# Federation Epic

## Overview
The Federation Epic is responsible for connecting the local instance with other decentralized instances, enabling cross-platform communication and content sharing. It handles instance discovery, trust management, and activity syndication.

## Key Models

### Instance (`backend/epics/federation/models/federation.go`)
Represents a known federated instance in the network.
- **Fields**: `domain`, `inbox_url`.
- **Trust Level**: `trust_level` ("trusted", "limited", "blocked") to manage interactions.
- **Last Seen**: `last_seen_at` timestamp.

### RemoteUser (`backend/epics/federation/models/federation.go`)
Cached profile of a user from a remote instance.
- **Fields**: `actor_id` (fully qualified ID), `username`, `display_name`, `instance`, `avatar_url`.
- **Metadata**: `profile_visibility`.
- **FetchedAt**: `fetched_at` timestamp for cache invalidation.

### RemotePost (`backend/epics/federation/models/federation.go`)
Cached post from a remote instance, displayed locally.
- **Fields**: `remote_post_id`, `origin_instance`, `author`, `author_actor_id`, `content`.
- **Interaction Counts**: Local cache of `like_count`, `comment_count`.
- **Visibility**: `visibility` ("public", "followers").

### RemoteFollow / RemoteFollower (`backend/epics/federation/models/federation.go`)
Represents relationships between local and remote users.
- **RemoteFollow**: Local user follows a remote user.
- **RemoteFollower**: Remote user follows a local user.

### FederationEvent (`backend/epics/federation/models/federation.go`)
Represents an outgoing event in the federation queue.
- **Fields**: `type` (e.g., "CreatePost", "Follow"), `target_instance`, `payload` (ActivityPub format).
- **Status**: `status` ("pending", "sent", "failed"), `retry_count`.

## Features

1.  **Instance Discovery & Trust**
    -   Tracks known instances and their status.
    -   Supports `trust_level` to control federation policies (e.g., block untrusted instances).

2.  **Cross-Instance Interaction**
    -   Users can follow users on other instances (`RemoteFollow`).
    -   Users can view posts from followed remote users (`RemotePost`).
    -   Content is cached locally for performance.

3.  **Activity Publishing (Outbound)**
    -   Events (posts, likes, follows) are queued as `FederationEvent`.
    -   Uses an ActivityPub-inspired `ActivityEnvelope` format.
    -   Retry mechanism for failed deliveries.

4.  **Activity Processing (Inbound)**
    -   Receives activities from other instances to update local caches (`RemoteUser`, `RemotePost`).
    -   Handles incoming follow requests.

## Data Structures
-   **ActivityEnvelope**: Standardized JSON-LD-like structure for inter-server communication.
