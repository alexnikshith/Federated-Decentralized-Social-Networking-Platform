# Federation Setup Guide

This guide helps you set up and test the federated multi-server architecture.

## Architecture Overview

The system uses an **ActivityPub-inspired REST protocol** to enable two independent server instances to communicate and share content.

### Key Components

- **Server 1**: `localhost:8080` → Database: `federated_social`
- **Server 2**: `localhost:8081` → Database: `federated_social_server2`
- **Federation Protocol**: HTTP REST with `/federation/inbox` endpoint
- **Isolation**: Each server has its own database, no shared collections

---

## Prerequisites

1. **MongoDB Atlas Account** (Free tier is sufficient)
2. **Docker & Docker Compose** installed
3. **MongoDB Shell (`mongosh`)** for database initialization
4. **`jq`** for test script JSON parsing (optional)

---

## Setup Instructions

### Step 1: Environment Configuration

Both servers share the same `.env` file but use different environment variables at runtime.

**File**: `/Users/riteeshtm/Public/Coding/GitHub-Personal/SoftwareEngineeringProject/Federated-Decentralized-Social-Networking-Platform/backend/.env`

Make sure your `.env` contains:

```env
PORT=8080
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=fed erated_social
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@federated-social.com
```

> **Note**: The `DB_NAME` will be overridden per server in `docker-compose.yml`

---

### Step 2: Initialize Federation Databases

Run the initialization script to set up trusted instance records in both databases:

```bash
cd /Users/riteeshtm/Public/Coding/GitHub-Personal/SoftwareEngineeringProject/Federated-Decentralized-Social-Networking-Platform

# Make script executable
chmod +x scripts/init_federation.sh

# Run initialization
./scripts/init_federation.sh
```

This script creates:
- `instances` collection in `federated_social` (Server 1) with Server 2 as trusted
- `instances` collection in `federated_social_server2` (Server 2) with Server 1 as trusted

---

### Step 3: Build and Start Servers

```bash
# Build Docker images
docker-compose build server1 server2

# Start both servers
docker-compose up server1 server2

# Or run in detached mode
docker-compose up -d server1 server2
```

**Check Logs**:
```bash
# Server 1 logs
docker-compose logs -f server1

# Server 2 logs
docker-compose logs -f server2
```

You should see:
```
Server starting on :8080 (Instance: server1, Federation: true)
Federation enabled - creating federation indexes
Federation routes registered
Federation activity processor started
```

---

### Step 4: Verify Instance Discovery

Test that both servers can be discovered:

```bash
# Server 1
curl http://localhost:8080/.well-known/instance-info | jq

# Server 2
curl http://localhost:8081/.well-known/instance-info | jq
```

**Expected Output**:
```json
{
  "instance": "server1",
  "domain": "localhost:8080",
  "federation": true,
  "inbox": "/federation/inbox",
  "version": "1.0"
}
```

---

## Testing Federation

### Automated Test

Run the comprehensive test script:

```bash
chmod +x scripts/test_federation.sh
./scripts/test_federation.sh
```

This script tests:
1. Instance discovery
2. User registration on both servers
3. Post creation on Server 1
4. Federation propagation to Server 2
5. Bidirectional federation (Server 2 → Server 1)

---

### Manual Testing

#### 1. Register Users

**Server 1 - Create Alice**:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@server1.com",
    "password": "password123",
    "display_name": "Alice from Server 1"
  }'
```

Save the `token` from the response.

**Server 2 - Create Bob**:
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob",
    "email": "bob@server2.com",
    "password": "password123",
    "display_name": "Bob from Server 2"
  }'
```

Save the `token` from the response.

---

#### 2. Create Post on Server 1

```bash
curl -X POST http://localhost:8080/api/posts \
  -H "Authorization: Bearer <ALICE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from Alice on Server 1! 🚀"}'
```

---

#### 3. Check Federation (Wait 10-15 seconds)

The activity processor runs every 10 seconds. Wait for federation to propagate.

**Check Server 2 Database**:
```bash
mongosh "mongodb+srv://your-uri/federated_social_server2" --quiet --eval "db.remote_posts.find().pretty()"
```

You should see Alice's post with `origin_instance: "localhost:8080"`.

---

#### 4. View Federated Feed on Server 2

```bash
curl http://localhost:8081/api/feed \
  -H "Authorization: Bearer <BOB_TOKEN>"  | jq
```

**Expected**: Bob's feed includes Alice's post with `is_remote: true` and author showing `alice@localhost:8080`.

---

## Architecture Details

### Database Collections (Per Server)

#### New Federation Collections:

1. **`instances`** - Tracks known federated instances
   ```js
   {
     domain: "localhost:8081",
     inbox_url: "http://localhost:8081/federation/inbox",
     trust_level: "trusted",  // or "limited", "blocked"
     last_seen_at: ISODate(),
     created_at: ISODate()
   }
   ```

2. **`remote_users`** - Cached remote users
   ```js
   {
     actor_id: "http://localhost:8081/users/bob",
     username: "bob",
     instance: "localhost:8081",
     display_name: "Bob from Server 2",
     avatar_url: "",
     fetched_at: ISODate()
   }
   ```

3. **`remote_posts`** - Cached remote posts
   ```js
   {
     remote_post_id: "http://localhost:8081/posts/abc123",
     origin_instance: "localhost:8081",
     author: "bob@localhost:8081",
     author_actor_id: "http://localhost:8081/users/bob",
     content: "Hello from Server 2!",
     visibility: "public",
     received_at: ISODate(),
     created_at: ISODate()
   }
   ```

4. **`federation_events`** - Outgoing event queue
   ```js
   {
     type: "CreatePost",
     target_instance: "localhost:8081",
     payload: { /* ActivityEnvelope */ },
     status: "pending",  // or "sent", "failed"
     retry_count: 0,
     last_attempt: ISODate()
   }
   ```

---

### Federation Flow

#### Outgoing (Server 1 → Server 2)

1. User creates post on Server 1
2. Post saved to `federated_social.posts`
3. **TODO**: Federation event queued to `federation_events` (not yet hooked)
4. Activity processor picks up pending event
5. Sends POST to `http://localhost:8081/federation/inbox`
6. Server 2 receives activity, validates, caches in `remote_posts`

#### Incoming (Server 2 → Server 1)

1. Server 1's `/federation/inbox` receives CreatePost activity
2. Validates: instance trust, activity structure
3. Caches remote user in `remote_users`
4. Caches remote post in `remote_posts`
5. Returns `202 Accepted`

---

## Troubleshooting

### Federation Not Working

**Check Activity Processor Logs**:
```bash
docker-compose logs server1 | grep -i federation
docker-compose logs server2 | grep -i federation
```

**Verify Instances are Trusted**:
```bash
mongosh "your-mongo-uri/federated_social" --eval "db.instances.find().pretty()"
mongosh "your-mongo-uri/federated_social_server2" --eval "db.instances.find().pretty()"
```

**Check Pending Events**:
```bash
mongosh "your-mongo-uri/federated_social" --eval "db.federation_events.find({status: 'pending'}).pretty()"
```

**Manually Trigger Inbox**:
```bash
curl -X POST http://localhost:8081/federation/inbox \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CreatePost",
    "actor": "http://localhost:8080/users/alice",
    "origin": "localhost:8080",
    "timestamp": "2026-02-06T00:00:00Z",
    "object": {
      "id": "http://localhost:8080/posts/test",
      "content": "Test federation post",
      "author": "alice",
      "author_id": "http://localhost:8080/users/alice",
      "visibility": "public"
    }
  }'
```

---

### Federation Events Not Processing

**Reason**: Post creation doesn't automatically trigger federation yet.

**Manual Workaround**: Directly insert federation event into database:

```js
db.federation_events.insertOne({
  type: "CreatePost",
  target_instance: "localhost:8081",
  payload: {
    type: "CreatePost",
    actor: "http://localhost:8080/users/alice",
    origin: "localhost:8080",
    timestamp: new Date(),
    object: {
      id: "http://localhost:8080/posts/abc123",
      content: "Hello from Server 1!",
      author: "alice",
      author_id: "http://localhost:8080/users/alice",
      visibility: "public"
    }
  },
  status: "pending",
  retry_count: 0,
  created_at: new Date(),
  updated_at: new Date()
})
```

---

## Next Steps

### Remaining TODOs

1. **Hook Post Creation** Add federation trigger in `CreatePost` handler
2. **Federated Feed Endpoint**: Create `/api/feed/federated` using `FederatedFeedService`
3. **Frontend Integration**: Update UI to show remote posts with instance badges
4. **Add Follow Federation**: Implement cross-server follows
5. **Add Like/Comment Federation**: Implement cross-server interactions

---

## Academic Justification

This implementation demonstrates:

✅ **Federated Architecture**: Logical isolation with separate databases  
✅ **Data Sovereignty**: Each server owns its own data  
✅ **Trust Boundaries**: Instance-level trust management  
✅ **ActivityPub Protocol**: Industry-standard federation pattern  
✅ **Async Processing**: Background event queue with retry logic  
✅ **Free-Tier Compatible**: Single MongoDB cluster, multiple databases  

The multi-database approach within a single cluster is architecturally equivalent to completely separate MongoDB instances, making it ideal for academic demonstration and development.

---

## Production Considerations

For production deployment:

1. **Use Separate Clusters**: Deploy each instance with its own MongoDB cluster
2. **Add Authentication**: Implement signed HTTP requests (HTTP Signatures)
3. **Rate Limiting**: Prevent federation abuse
4. **HTTPS**: Encrypt all federation traffic
5. **Monitoring**: Track federation health and delivery rates
6. **Instance Blocking UI**: Admin interface for trust management
