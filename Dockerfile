# ============================================
# Build Stage: Install dependencies and build
# ============================================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat git python3 py3-pip make g++ libusb-dev eudev-dev linux-headers

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json yarn.lock ./

# Fix arm64 timeouts and add retry logic for public npm packages
RUN yarn config set network-timeout 300000 && \
    yarn config set network-concurrency 1

# Install dependencies with retry logic
RUN yarn install --frozen-lockfile || \
    (sleep 10 && yarn install --frozen-lockfile) || \
    (sleep 30 && yarn install --frozen-lockfile)

# Copy source code
COPY . .

# Remove deprecated @types/minimatch that causes build failures
RUN rm -rf node_modules/@types/minimatch

# Run after-install (generates types and applies any remaining patches)
RUN yarn after-install

# Accept custom chains config as build argument
ARG CUSTOM_CHAINS_CONFIG
ENV CUSTOM_CHAINS_CONFIG=${CUSTOM_CHAINS_CONFIG}

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_GATEWAY_URL_PRODUCTION=/cgw
ENV NEXT_PUBLIC_IS_PRODUCTION=true
ENV NEXT_PUBLIC_SAFE_VERSION=1.3.0
ENV NEXT_PUBLIC_WC_PROJECT_ID=dce8b76eeca269d6a63782777c1972d9
ENV NEXT_PUBLIC_BEAMER_ID=
ENV NEXT_PUBLIC_INFURA_TOKEN=
ENV NEXT_PUBLIC_SAFE_APPS_INFURA_TOKEN=
ENV NEXT_PUBLIC_SENTRY_DSN=

# Build the Next.js app
RUN yarn build

# ============================================
# Runtime Stage: Minimal production image
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies (serve)
RUN npm install -g serve

# Copy only the built static files from builder
COPY --from=builder /app/out ./out

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8080

ENV PORT=8080
ENV REVERSE_PROXY_UI_PORT=8080
ENV NODE_ENV=production

# Serve the pre-built static files
CMD ["serve", "out", "-p", "8080", "-n"]
