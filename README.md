# Federate Social - Federated Decentralized Social  Networking Platform 

## Project Overview
This project implements a **federated decentralized social networking platform**
that enables privacy-aware communication, decentralized identity, and controlled
cross-instance interaction without centralized control.

Each server instance is independently managed and stores its own data, while
communicating with other trusted instances using a **custom REST-based federation
protocol**.

This project is developed as part of **23CSE311 – Software Engineering**.

---

## Objectives
- Decentralized user identity and authentication
- Instance-level data ownership
- REST-based cross-instance federation
- Privacy-aware content visibility
- Transparent and ethical moderation

---

## Technology Stack
**Backend (Primary):**
- Go (net/http)
- MongoDB

**Frontend:**
- React + TypeScript (Vite)

**Federation:**
- Custom REST-based federation protocol (JSON over HTTP)

**Fallback / Utilities:**
- Node.js (scripts and adapters)

**DevOps:**
- Docker, Docker Compose

---

## Architecture Summary
- Layered architecture (Handler → Service → Repository)
- EPIC-aligned backend modules
- Frontend mirrors backend EPIC structure
- Federation handled via REST APIs between instances

---

## Current Implementation Scope (Phase 1)
- User authentication (signup/login)
- Local post creation and feed
- REST-based federation demo (post forwarding)
- Manual moderation (report & delete)
- AI features planned for future phases

---

## Team
- Riteesh TM  
- Nikshith G  
- Akhil R  
- Kaushal Loya  
- Vishnu Sathvik R  

