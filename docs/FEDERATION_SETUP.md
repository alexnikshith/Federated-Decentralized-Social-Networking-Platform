# Federation Setup Guide

This guide helps you set up and test the federated multi-server architecture.

## Architecture Overview

The system uses an **ActivityPub-inspired REST protocol** to enable two independent server instances to communicate and share content.

### Key Components

-   **Server 1**: `localhost:8080` → Database: `federated_social`
-   **Server 2**: `localhost:8081` → Database: `federated_social_server2`
-   **Federation Protocol**: HTTP REST with `/federation/inbox` endpoint
-   **Isolation**: Each server has its own database, no shared collections

---

## Prerequisites

1.  **MongoDB Atlas Account** or Local MongoDB instance
2.  **Docker & Docker Compose** installed
3.  **Go 1.21+** (if running locally without Docker)
4.  **`jq`** for test script JSON parsing (optional)

---

## Setup Instructions

### Step 1: Environment Configuration

Both servers share the same `.env` file but can be configured differently via environment variables or Docker Compose.

**File**: `/backend/.env`

Make sure your `.env` contains:

```env
PORT=8080
MONGO_URI=mongodb://localhost:27017
DB_NAME=federated_social
JWT_SECRET=your-secret-key
```

> **Note**: In Docker, `DB_NAME` and `PORT` are typically overridden in `docker-compose.yml`.

### Step 2: Initialize Federation Databases

Run the initialization script to set up trusted instance records in both databases. This is necessary for the servers to accept activities from each other.

```bash
# From project root
chmod +x backend/scripts/init_federation.sh
./backend/scripts/init_federation.sh
```

### Step 3: Start Servers using Docker

```bash
# Build and start both servers
docker-compose up --build server1 server2
```

**Verify Logs**:
```bash
docker-compose logs -f server1
```
Expected output: `Federation enabled - creating federation indexes`, `Federation activity processor started`.

---

## Testing Federation

### Automated Test
The platform includes a test script to verify cross-instance communication.

```bash
chmod +x backend/scripts/test_federation.sh
./backend/scripts/test_federation.sh
```

### Manual Verification
1.  **Register a User on Server 1**: `POST http://localhost:8080/api/auth/signup`
2.  **Register a User on Server 2**: `POST http://localhost:8081/api/auth/signup`
3.  **Follow remote user**: Call `/api/federation/users/follow` on Server 1 with the remote user's details.
4.  **Create Post**: Create a post on Server 1.
5.  **Check Remote Feed**: On Server 2, check if the post appears in the feed after the background worker processes it.

---

## Technical Details

### Outgoing Queue
Events are stored in the `federation_events` collection with a `pending` status. The `FederationWorker` process runs periodically to deliver these payloads to target instances.

### Inbound Processing
The `/federation/inbox` handler:
1.  Verifies the `origin` domain exists in the `instances` collection.
2.  Parses the `ActivityEnvelope`.
3.  Caches remote entities (`remote_users`, `remote_posts`) in the local database.
4.  Updates local counters (likes, comments).

---

## Troubleshooting

-   **Connection Refused**: Ensure Docker containers can resolve each other. The `docker-compose.yml` should define a shared network.
-   **Unauthorized**: Check if `init_federation.sh` was run successfully. Each server must have the other's domain in its `instances` collection with `trust_level: "trusted"`.
-   **Events Stuck in Pending**: Ensure the federation worker is running. Check logs for delivery errors and `retry_count`.
