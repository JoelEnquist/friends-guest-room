#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required."
  exit 1
fi

if [[ "${DATABASE_URL}" == file:* ]]; then
  echo "SQLite file DATABASE_URL is no longer supported in this repo."
  echo "Use Postgres (local docker-compose or managed Postgres for Vercel)."
  exit 1
fi

echo "Running Prisma migrations (Postgres)..."
npx prisma migrate deploy
