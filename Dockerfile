# ============================================================================
# CatFish - Node.js Production Container (Sem Nginx / Sem Domínio)
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build production assets
COPY . .
RUN npm run build

# ============================================================================
# Production Runner (Node.js nativo servindo a aplicação SPA)
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy dependencies and compiled assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.ts ./vite.config.ts

# Expose default port 5173
EXPOSE 5173

# Health check to ensure the server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5173/ || exit 1

# Start Vite production preview server bound to 0.0.0.0 (accessible via LAN/Tunnel)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173", "--config", "./vite.config.ts"]
