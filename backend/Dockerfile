# backend/Dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl curl

FROM base AS deps
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

FROM base AS builder
ARG DATABASE_URL="postgresql://postgres:postgres@postgres:5432/evently?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY backend/package-lock.json ./package-lock.json
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
COPY backend/prisma ./prisma
RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/dist ./dist
COPY backend/prisma ./prisma
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["./docker-entrypoint.sh"]
