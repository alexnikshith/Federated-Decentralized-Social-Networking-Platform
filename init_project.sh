#!/usr/bin/env bash

PROJECT_NAME="Federated-Decentralized-Social-Networking-Platform"

echo "Creating project structure: $PROJECT_NAME"

# Root
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME || exit 1

# Root files
touch README.md .gitignore docker-compose.yml .env.example

# =========================
# Docs
# =========================
mkdir -p docs/{epics,architecture,reports,screenshots}

touch docs/epics/{epic-1-user-autonomy.md,epic-2-content.md,epic-3-federation.md,epic-4-moderation.md}
touch docs/architecture/{system-architecture.md,api-flow.md,database-schema.md}
touch docs/reports/{user-activity.md,engagement.md,federation.md}

# =========================
# Backend - Go
# =========================
mkdir -p backend-go/{cmd/api,cmd/federation}
touch backend-go/cmd/api/main.go
touch backend-go/cmd/federation/main.go

mkdir -p backend-go/internal/{config,middleware,utils,tests}
touch backend-go/internal/config/{env.go,database.go}
touch backend-go/internal/middleware/{auth.go,error.go}
touch backend-go/internal/utils/{crypto.go,logger.go}
touch backend-go/internal/tests/{user_test.go,content_test.go}

mkdir -p backend-go/internal/modules/{user,content,federation,moderation,analytics}

touch backend-go/internal/modules/user/{handler.go,service.go,repository.go,model.go}
touch backend-go/internal/modules/content/{handler.go,service.go,repository.go,model.go}
touch backend-go/internal/modules/federation/{handler.go,service.go,protocol.go}
touch backend-go/internal/modules/moderation/{handler.go,service.go,model.go}
touch backend-go/internal/modules/analytics/service.go

touch backend-go/go.mod backend-go/go.sum

# =========================
# Backend - Node (Fallback)
# =========================
mkdir -p backend-node/{scripts,adapters}
touch backend-node/scripts/seed-data.js
touch backend-node/adapters/federation-adapter.js
touch backend-node/package.json

# =========================
# Frontend - React
# =========================
mkdir -p frontend/src/app/{core/{api,auth},modules/{user,feed,federation,moderation},shared/components}

touch frontend/src/app/{App.tsx,routes.tsx}
touch frontend/src/main.tsx
touch frontend/index.html
touch frontend/package.json
touch frontend/vite.config.ts

# =========================
# AI Services (Future)
# =========================
mkdir -p ai-services
touch ai-services/README.md

# =========================
# Deployment
# =========================
mkdir -p deployment/{docker,cloud}
touch deployment/docker/{go-api.Dockerfile,react.Dockerfile,node-utils.Dockerfile}
touch deployment/cloud/aws-notes.md

echo "✅ Project structure created successfully."
