# API Flow

## Overview
The system exposes REST APIs for both client interaction and federation
between server instances.

---

## Client API Flow
1. User sends login request
2. Server validates credentials
3. JWT token is issued
4. Token is used for authenticated requests

---

## Federation API Flow

Federation between instances is handled using **REST-based APIs**.

### Example Endpoint
POST /federation/posts


### Flow
1. Local instance creates a post
2. Federation service sends the post to trusted instances
3. Remote instance validates trust
4. Post is accepted and stored locally

---

## Error Handling
- Unauthorized instances are rejected
- Failed federation requests are logged
- Retries are handled asynchronously
