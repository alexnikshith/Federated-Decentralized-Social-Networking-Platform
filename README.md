# Federate Social - Federated Decentralized Social Networking Platform

## 🎉 Epic 1: Identity - COMPLETED ✅

All 8 user stories for Epic 1 have been successfully implemented! The system now supports:
- ✅ Account creation with unique usernames
- ✅ Secure JWT-based authentication
- ✅ Profile management and editing
- ✅ Privacy controls (public/followers-only)
- ✅ Account deactivation
- ✅ Password change functionality
- ✅ Activity logging and tracking
- ✅ Secure logout with token invalidation

---

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
# Start all services
docker-compose up

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8080
# MongoDB: localhost:27017
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

**📖 For detailed setup instructions, see [QUICKSTART.md](QUICKSTART.md)**

---

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
- ✅ Decentralized user identity and authentication (Epic 1 - DONE)
- 🔄 Instance-level data ownership
- 🔄 REST-based cross-instance federation
- 🔄 Privacy-aware content visibility
- 🔄 Transparent and ethical moderation

---

## Technology Stack

**Backend (Primary):**
- Go 1.21 (net/http, gorilla/mux)
- MongoDB 7.0
- JWT Authentication (golang-jwt/jwt/v5)
- Bcrypt password hashing

**Frontend:**
- React 18 + TypeScript 5
- Vite 5 (build tool)
- React Router 6 (routing)
- Zustand 4 (state management)
- Axios (HTTP client)

**Federation:**
- Custom REST-based federation protocol (JSON over HTTP)

**DevOps:**
- Docker & Docker Compose
- Multi-stage builds for optimization

---

## Architecture Summary
- **Layered architecture:** Handler → Service → Repository
- **EPIC-aligned modules:** Each epic is self-contained
- **Frontend mirrors backend:** Same epic structure
- **Federation:** REST APIs between instances

---

## Project Structure

```
Federated-Decentralized-Social-Networking-Platform/
├── backend/
│   ├── config/              # Configuration management
│   ├── database/            # MongoDB connection
│   ├── middleware/          # Auth, CORS, logging
│   ├── identity/            # ✅ Epic 1: Identity (DONE)
│   ├── content-sharing/     # 🔄 Epic 2: Content Sharing
│   ├── federation/          # 🔄 Epic 3: Federation
│   ├── safety/              # 🔄 Epic 4: Safety
│   ├── reports/             # 🔄 Epic 5: Reports
│   └── main.go              # Server entry point
│
├── frontend/
│   ├── identity/            # ✅ Epic 1: Identity (DONE)
│   ├── content-sharing/     # 🔄 Epic 2: Content Sharing
│   ├── federation/          # 🔄 Epic 3: Federation
│   ├── safety/              # 🔄 Epic 4: Safety
│   ├── reports/             # 🔄 Epic 5: Reports
│   └── src/                 # Main application
│
├── docs/                    # Documentation
│   └── EPIC1_IDENTITY.md    # Epic 1 detailed docs
├── docker-compose.yml       # Docker orchestration
├── QUICKSTART.md            # Quick start guide
└── README.md                # This file
```

---

## Implementation Status

### ✅ Epic 1: Identity (COMPLETED)
- **US1.1:** Account Creation ✅
- **US1.2:** Secure Login ✅
- **US1.3:** Profile Editing ✅
- **US1.4:** Privacy Controls ✅
- **US1.5:** Account Deactivation ✅
- **US1.6:** Password Change ✅
- **US1.7:** Activity Logs ✅
- **US1.8:** Secure Logout ✅

### 🔄 Epic 2: Content Sharing (Planned)
- Post creation and viewing
- Media attachments
- Local and federated feeds
- Like and comment system

### 🔄 Epic 3: Federation (Planned)
- Instance discovery
- Cross-instance post sharing
- Remote user profiles
- Federation protocol implementation

### 🔄 Epic 4: Safety (Planned)
- Content moderation
- User reporting
- Blocking and muting
- Content filtering

### 🔄 Epic 5: Reports (Planned)
- Analytics dashboard
- User statistics
- Content metrics
- System health monitoring

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

## Security Features

- 🔐 **JWT Authentication** - Token-based auth with 24h expiry
- 🔒 **Bcrypt Password Hashing** - Industry-standard encryption
- 🛡️ **Session Management** - Database-backed token validation
- 👁️ **Privacy Controls** - Public/followers-only profiles
- 📊 **Activity Logging** - Comprehensive audit trail
- 🚫 **Soft Deletion** - Account deactivation with data preservation

---

## Development

### Prerequisites
- Docker & Docker Compose
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
echo "VITE_API_URL=http://localhost:8080" > .env
```

### Running Tests
```bash
# Backend (when tests are added)
cd backend && go test ./...

# Frontend (when tests are added)
cd frontend && npm test
```

---

## Documentation

- **Quick Start Guide:** [QUICKSTART.md](QUICKSTART.md)
- **Epic 1 Documentation:** [docs/EPIC1_IDENTITY.md](docs/EPIC1_IDENTITY.md)
- **API Reference:** See Epic documentation
- **Architecture:** This README

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
2. **Epic 2: Content Sharing** - Implement post creation and feeds
3. **Epic 3: Federation** - Build cross-instance communication
4. **Epic 4: Safety** - Add moderation and reporting
5. **Epic 5: Reports** - Create analytics dashboard

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m "feat: your feature description"`
5. Push: `git push origin feature/your-feature`
6. Create a pull request

---

## License

This project is developed for educational purposes as part of Software Engineering coursework.

---

**🎉 Epic 1 is complete! Ready to build the future of federated social networking! 🚀**
