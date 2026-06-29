# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for BFF URL (baked at build time for rewrites)
ARG BFF_INTERNAL_URL=http://bff:4000

ENV BFF_INTERNAL_URL=$BFF_INTERNAL_URL

# Sentry/GlitchTip DSN — baked into the client bundle at build time (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_STOREFRONT_SENTRY_DSN=

ENV NEXT_PUBLIC_STOREFRONT_SENTRY_DSN=$NEXT_PUBLIC_STOREFRONT_SENTRY_DSN

# Copy package files (context is project root); lockfile is mandatory for reproducible builds
COPY services/storefront/package.json services/storefront/package-lock.json ./

# Install dependencies strictly from the lockfile
RUN npm ci

# Copy storefront source
COPY services/storefront/ .

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3003

ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
