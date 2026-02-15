#!/bin/sh
set -eu

APP_PID=""

cleanup() {
  if [ -n "${APP_PID}" ]; then
    echo "Forwarding shutdown signal to Next.js process..."
    kill -TERM "${APP_PID}" 2>/dev/null || true
    wait "${APP_PID}" || true
  fi
}

trap cleanup INT TERM

echo "Waiting for PostgreSQL..."
node /app/scripts/wait-for-db.mjs

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting Next.js server..."
node_modules/.bin/next start -H 0.0.0.0 -p 3000 &
APP_PID="$!"
wait "${APP_PID}"
