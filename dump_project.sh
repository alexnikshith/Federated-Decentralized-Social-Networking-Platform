#!/usr/bin/env bash

OUT="review_dump.txt"
> "$OUT"

echo "==== PROJECT TREE ====" >> "$OUT"
tree -L 4 -a -I "node_modules|dist|build|.git" >> "$OUT"

FILES=(
  "backend-go/cmd/api/main.go"
  "backend-go/internal/config/database.go"
  "backend-go/internal/modules/user/handler.go"
  "backend-go/internal/modules/user/service.go"
  "backend-go/internal/modules/user/repository.go"
  "backend-go/internal/modules/user/model.go"
  "backend-go/internal/modules/federation/handler.go"
  "backend-go/internal/modules/federation/protocol.go"
  "frontend/package.json"
  "frontend/vite.config.ts"
  "frontend/src/app/App.tsx"
  "frontend/src/app/routes.tsx"
  ".env.example"
  ".gitignore"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    echo -e "\n==============================" >> "$OUT"
    echo "FILE: $f" >> "$OUT"
    echo "==============================" >> "$OUT"
    sed 's/\r$//' "$f" >> "$OUT"
  fi
done

echo "Review dump ready: $OUT"
