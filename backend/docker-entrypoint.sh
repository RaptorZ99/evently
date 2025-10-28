#!/bin/sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/prisma/schema.prisma" ]; then
  PRISMA_SCHEMA="$SCRIPT_DIR/prisma/schema.prisma"
else
  PRISMA_SCHEMA="$SCRIPT_DIR/../prisma/schema.prisma"
fi

npx prisma generate --schema "$PRISMA_SCHEMA"
npx prisma migrate deploy --schema "$PRISMA_SCHEMA"
node dist/seed.js
exec node dist/server.js
