#!/bin/sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PRISMA_SCHEMA="$SCRIPT_DIR/prisma/schema.prisma"

npx prisma generate --schema "$PRISMA_SCHEMA"
npx prisma migrate deploy --schema "$PRISMA_SCHEMA"
node dist/seed.js
exec node dist/server.js
