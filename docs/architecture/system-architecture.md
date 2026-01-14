# System Architecture

## Overview
The system follows a **federated multi-instance architecture** where each
instance is independently operated and stores its own data.

Instances communicate using a **REST-based federation protocol** without
any centralized coordinator.

---

## Core Components
- Client (React frontend)
- API Server (Go backend)
- Database (MongoDB)
- Federation Worker

---

## Architecture Style
- Layered architecture
- Handler → Service → Repository
- EPIC-aligned backend modules

---

## Federation Communication Model
- Instances expose REST endpoints
- Communication uses JSON over HTTP
- Only trusted instances are allowed to interact

---

## Federation Flow (Simplified)
1. User creates a post on Instance A
2. Post is stored locally
3. Federation service forwards the post via REST
4. Instance B stores the post with origin metadata

---

## Design Rationale
This architecture prioritizes:
- Data sovereignty
- Scalability
- Failure isolation
- Clear responsibility boundaries
