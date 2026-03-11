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

This platform implements a **federated decentralized social networking ecosystem** designed for privacy-centric communication and decentralized identity management. It features a **Premium Cinematic UI/UX** that utilizes interactive holographic projections, glassmorphism, and dynamic celestial animations to provide a futuristic user experience.

Each node in the network is independently managed, ensuring data sovereignty, while cross-instance interaction is enabled through a **High-Fidelity Federation Protocol**.

Developed as a flagship project for **23CSE311 – Software Engineering**.


## Technology Stack

**Frontend:**
- **React 18** + **TypeScript 5**
- **Vite 5** (Ultra-fast build pipeline)
- **Framer Motion** (Cinematic Handshakes & Advanced Animations)
- **Lucide React** (High-Density Vector Icons)
- **Sonner** (Enriched Notification System)
- **Tailwind CSS** + **shadcn UI** (40+ Atomic Components)
- **Custom CSS Engine** (Glassmorphism & Holographic Effects)
- **Zustand 4** (Neural State Management)
- **React Query** (Asynchronous Synchronization)

**Backend:**
- **Go 1.21** (High-performance concurrency)
- **MongoDB 7.0** (Document-based persistence)
- **JWT V5** (Secure Neural Authentication)
- **Bcrypt** (Military-grade password hashing)

**DevOps:**
- **Docker & Docker Compose** (Containerized orchestration)
- **Multi-stage builds** (Optimized deployment footprints)

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
│   │   ├── content_sharing/ # ✅ Epic 2: Content Sharing (DONE)
│   │   ├── federation/      # 🔄 Epic 3: Federation (IN PROGRESS)
│   │   ├── safety/          # ✅ Epic 4: Safety (DONE)
│   │   └── reports/         # ✅ Epic 5: Moderation & Reports (DONE)
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

## 🔌 API Documentation

For a comprehensive list of all available REST API endpoints across all epics (Auth, Feed, Federation, Moderation), please refer to the [**API Documentation**](API.md).

### System
- `GET /health` - Health check
- `WS /ws` - Synchronized real-time events via WebSocket


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

## Advanced Identity & Security

- 🦾 **Cinematic Handshake Protocol** - Unified holographic authentication flow with interactive opening/closing transitions.
- 🔐 **Real-time Neural Validation** - Debounced email existence checks against the active Neural Node before submission.
- 🛡️ **Synchronized Defense Patterns** - Unified password complexity requirements across Signup and Recovery flows.
- 👁️ **Data Privacy Toggles** - Integrated visibility controls for sensitive input fields.
- 🔒 **JWT Neural Link** - Token-based authentication with 24-hour synchronized expiry.
- 🔒 **Bcrypt Shielding** - Industry-standard hashing for all stored credentials.
- 👁️ **Privacy Geofencing** - Granular profile visibility controls (Public vs. Secure).
- 📊 **Audit Handshakes** - Comprehensive activity logging for all security events.
- 🚫 **Soft Deactivation** - Secure account deactivation with state preservation.

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

## Team

- **Riteesh TM**
- **Nikshith G**
- **Akhil R**
- **Kaushal Loya**
- **Vishnu Sathwick R**

**Course:** 23CSE311 – Software Engineering
