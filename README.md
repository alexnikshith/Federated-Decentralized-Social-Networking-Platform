# Federate Social - Federated Decentralized Social Networking Platform

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
# Start all services
docker-compose up

# Access the application
# Frontend: http://localhost:8080
# Backend API: http://localhost:8080/api
# MongoDB: localhost:27017

For detailed instructions on local development and environment setup, see the [**Getting Started Guide**](GETTING_STARTED.md).
```

### Local Development
```bash
# Backend
cd backend
go mod download
go run main.go

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

---

## Project Overview

This project implements a **federated decentralized social networking platform** that enables privacy-aware communication, decentralized identity, and controlled cross-instance interaction without centralized control.

Each server instance is independently managed and stores its own data, while communicating with other trusted instances using a **custom REST-based federation protocol**.

This project is developed as part of **23CSE311 – Software Engineering**.

### Objectives
- ✅ Decentralized user identity and authentication (Epic 1 - DONE)
- 🔄 Instance-level data ownership
- 🔄 REST-based cross-instance federation
- 🔄 Privacy-aware content visibility
- 🔄 Transparent and ethical moderation

---

## Technology Stack

**Backend:**
- Go 1.21 (net/http, gorilla/mux)
- MongoDB 7.0
- JWT Authentication (golang-jwt/jwt/v5)
- Bcrypt password hashing

**Frontend:**
- React 18 + TypeScript 5
- Vite 5 (build tool)
- React Router 6 (routing)
- TanStack React Query (server state)
- Zustand 4 (local state)
- Tailwind CSS + shadcn UI (40+ components)
- Axios (HTTP client)

**DevOps:**
- Docker & Docker Compose
- Multi-stage builds

---

## Architecture Overview

### Backend Structure
- **Layered architecture:** Handler → Service → Repository
- **EPIC-aligned modules:** Each epic is self-contained
- **JWT-based auth:** Secure token management
- **REST API:** Standard HTTP endpoints

### Frontend Structure
The frontend follows an **Epic-Based Architecture** where each feature set has its own self-contained folder:

```
frontend/
├── src/
│   ├── components/          ← Global/Shared UI Components (shadcn UI)
│   ├── hooks/              ← Global/Shared Custom Hooks
│   ├── lib/                ← Global/Shared Utilities
│   ├── pages/              ← Global Pages (Index, 404)
│   ├── App.tsx             ← Main router
│   └── main.tsx
│
└── epics/                  ← Feature-Specific Code
    ├── identity/           ← Epic 1: Authentication & Profiles
    │   ├── pages/
    │   ├── store/
    │   ├── api/
    │   ├── handlers/
    │   ├── models/
    │   └── types/
    │
    ├── content-sharing/    ← Epic 2: Posts & Feed
    │   ├── pages/
    │   ├── components/
    │   ├── api/
    │   ├── models/
    │   ├── types/
    │   ├── store/
    │   └── service/
    │
    ├── federation/         ← Epic 3: Federated Networks
    │   ├── pages/
    │   ├── api/
    │   ├── store/
    │   └── types/
    │
    ├── reports/            ← Epic 4: Moderation & Safety
    │   ├── pages/
    │   ├── api/
    │   ├── store/
    │   └── types/
    │
    └── safety/             ← Epic 5: Security Features
        ├── api/
        ├── models/
        ├── types/
        └── store/
```

**Key Principles:**
- Global components/hooks/utilities in `src/`
- Epic-specific code in `epics/<epic_name>/`
- Clear separation of concerns
- Easy to scale and maintain

---

## Project Structure

```
Federated-Decentralized-Social-Networking-Platform/
├── backend/
│   ├── config/              # Configuration management
│   ├── database/            # MongoDB connection
│   ├── middleware/          # Auth, CORS, logging
│   ├── epics/
│   │   ├── identity/        # ✅ Epic 1: Identity (DONE)
│   │   ├── content_sharing/ # 🔄 Epic 2: Content Sharing
│   │   ├── federation/      # 🔄 Epic 3: Federation
│   │   ├── safety/          # 🔄 Epic 4: Safety
│   │   └── reports/         # 🔄 Epic 5: Reports
│   └── main.go
│
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components & layouts
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   ├── pages/          # Global pages
│   │   ├── App.tsx         # Main router
│   │   └── main.tsx
│   └── epics/              # Feature-specific code
│       ├── identity/       # ✅ Epic 1 (DONE)
│       ├── content-sharing/# 🔄 Epic 2
│       ├── federation/     # 🔄 Epic 3
│       ├── reports/        # 🔄 Epic 4
│       └── safety/         # 🔄 Epic 5
│
├── docs/                    # Documentation
│   ├── EPIC1_IDENTITY.md
│   ├── architecture/
│   └── epics/
│
├── docker-compose.yml       # Docker orchestration
└── README.md               # This file
```

---

## Implementation Status

### ✅ Epic 1: Identity (COMPLETED)
**Location:** Backend: `backend/epics/identity/` | Frontend: `frontend/epics/identity/`

**Features:**
- ✅ Account Creation with unique usernames
- ✅ Secure JWT-based authentication
- ✅ Profile management and editing
- ✅ Dedicated Settings page with split navigation
- ✅ Privacy controls (public/followers-only)
- ✅ Account deactivation (Danger Zone)
- ✅ Password change functionality
- ✅ Activity logging and tracking
- ✅ Secure logout with token invalidation

**Frontend Routes:**
- `/login` - User login (Epic 1)
- `/register` - Registration (Epic 1)
- `/profile` - Current user profile (Epic 1)
- `/profile/:username` - View other user profiles (Epic 1)
- `/settings` - User settings & account management (Epic 1)

**Status:** ✅ **Fully Implemented & Tested**

---

### 🔄 Epic 2: Content Sharing (PARTIAL)
**Location:** Backend: `backend/epics/content_sharing/` | Frontend: `frontend/epics/content-sharing/`

**Features:**
- ✅ Post creation and display
- ✅ Enhanced Comment system with premium UI
- ✅ Like/reaction system
- ✅ User notifications
- ✅ Follow/Unfollow
- ✅ Feed generation

**Frontend Routes:**
- `/feed` - Main content feed
- `/dashboard` - User dashboard

**Status:** ✅ **Implemented with Premium UI**

---

### 📋 Epic 3: Federation (UI READY)
**Location:** Backend: `backend/epics/federation/` | Frontend: `frontend/epics/federation/`

**Features:**
- 📋 Community discovery (UI ready)
- 📋 Content exploration (UI ready)
- 📋 Cross-instance communication (Backend needed)
- 📋 Instance networking (Backend needed)
- 📋 Federation protocol (Backend needed)

**Frontend Routes:**
- `/communities` - Browse communities (UI ready)
- `/explore` - Explore content (UI ready)

**Status:** 📋 **UI Ready, Backend Integration Needed**

---

### 📋 Epic 4: Reports & Moderation (PARTIAL)
**Location:** Backend: `backend/epics/reports/` | Frontend: `frontend/epics/reports/`

**Features:**
- ✅ About page (UI ready)
- 📋 Content reporting (Backend needed)
- 📋 Moderation dashboard (Backend needed)
- 📋 User reports and bans (Backend needed)

**Frontend Routes:**
- `/about` - About/Help page

**Status:** 📋 **Partial UI Ready**

---

### 📋 Epic 5: Safety & Security (PLACEHOLDER)
**Location:** Backend: `backend/epics/safety/` | Frontend: `frontend/epics/safety/`

**Planned Features:**
- 📋 Privacy controls
- 📋 Two-factor authentication
- 📋 Session management
- 📋 Account recovery
- 📋 Security alerts

**Status:** 📋 **Structure Ready, Implementation Needed**

---

## API Endpoints (Epic 1)

### Public Endpoints
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - User login
- `GET /api/profile/{id}` - View profile (with privacy check)

### Protected Endpoints
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password
- `GET /api/profile/me` - Get own profile
- `PUT /api/profile/me` - Update profile
- `POST /api/profile/me/deactivate` - Deactivate account
- `GET /api/profile/me/activity` - View activity logs

### System
- `GET /health` - Health check

**📖 Full API documentation: [docs/EPIC1_IDENTITY.md](docs/EPIC1_IDENTITY.md)**

---

## Frontend Features & Components

### Global UI Components (40+ shadcn Components)
- **Layout:** Header, Footer, Navigation
- **Forms:** Input, Label, Button, Select, Textarea, Dialog
- **Data Display:** Card, Table, Pagination, Breadcrumb
- **Feedback:** Toast, Alert, Progress
- **Navigation:** Tabs, Accordion, Dropdown Menu
- And 20+ more...

### State Management
- **Auth Store:** Zustand for authentication state
- **Server State:** React Query for API data
- **Context API:** Available for prop drilling prevention

### Styling
- **Tailwind CSS** v3 with utility classes
- **CSS Variables** for theming
- **Dark Mode** support (via next-themes)
- **Responsive Design** with mobile-first approach

### Routing
```
/                      → Landing page
/login                 → User login (Epic 1)
/register              → User registration (Epic 1)
/profile               → User profile (Epic 1)
/profile/:username     → View other profiles (Epic 1)
/feed                  → Content feed (Epic 2)
/dashboard             → User dashboard (Epic 2)
/communities           → Communities (Epic 3 - UI ready)
/explore               → Explore content (Epic 3 - UI ready)
/about                 → About page (Epic 4)
*                      → 404 Not Found
```

---

## Security Features

- 🔐 **JWT Authentication** - Token-based auth with 24h expiry
- 🔒 **Bcrypt Password Hashing** - Industry-standard encryption
- 🛡️ **Session Management** - Database-backed token validation
- 👁️ **Privacy Controls** - Public/followers-only profiles
- 📊 **Activity Logging** - Comprehensive audit trail
- 🚫 **Soft Deletion** - Account deactivation with data preservation
- 🔄 **CORS Configuration** - Secure cross-origin requests

---

## Development

### Prerequisites
- Docker & Docker Compose (for containerized development)
- Go 1.21+ (for local backend development)
- Node.js 18+ (for local frontend development)
- MongoDB 7.0+ (or use Docker)

### Environment Setup
```bash
# Copy environment files
cp .env.example .env

# Backend
cd backend
cp ../.env.example .env

# Frontend
cd frontend
npm install
```

### Running Tests
```bash
# Backend (when tests are added)
cd backend && go test ./...

# Frontend tests
cd frontend && npm run test
```

### Development Commands

**Backend:**
```bash
cd backend
go run main.go              # Run server
go mod tidy                 # Update dependencies
go test ./...               # Run tests
```

**Frontend:**
```bash
cd frontend
npm run dev                 # Development server
npm run build               # Production build
npm run lint                # ESLint check
npm run test                # Run tests
```

---

## Documentation

- **Setup & Usage Guide:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Epic 1 Documentation:** [docs/EPIC1_IDENTITY.md](docs/EPIC1_IDENTITY.md)
- **Architecture:** [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md)
- **Database Schema:** [docs/architecture/database-schema.md](docs/architecture/database-schema.md)
- **API Flow:** [docs/architecture/api-flow.md](docs/architecture/api-flow.md)

---

## Best Practices

### Frontend Development
- Keep epic-specific code inside its folder
- Use global components from `src/components/`
- Export public API from each epic
- Use absolute imports: `@/components/ui/button`
- Maintain TypeScript type safety
- Use shadcn UI components for consistency

### Backend Development
- Follow layered architecture (Handler → Service → Repository)
- Organize code by epic
- Use interfaces for loose coupling
- Implement proper error handling
- Write unit and integration tests
- Document public APIs

---

## Team

- **Riteesh TM**
- **Nikshith G**
- **Akhil R**
- **Kaushal Loya**
- **Vishnu Sathvik R**

**Course:** 23CSE311 – Software Engineering

---

## Next Steps

1. **Test Epic 1** - Thoroughly test all identity features
2. **Epic 2: Content Sharing** - Integrate feed and post features
3. **Epic 3: Federation** - Build cross-instance communication
4. **Epic 4: Safety** - Add moderation and reporting
5. **Epic 5: Reports** - Create analytics dashboard

---
