# ---- Stage 1: Build Frontend SPA ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/Group1FS/package*.json ./
RUN npm ci
COPY frontend/Group1FS/ ./
ENV VITE_MODE=production
ENV VITE_BACKEND_PRODUCTION_URL=/api/v1
RUN npm run build

# ---- Stage 2: Production Backend Runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
RUN rm -rf ./public && mkdir -p ./public
COPY --from=frontend-builder /app/frontend/dist ./public

# Run as non-root user for security
RUN addgroup -g 1001 appgroup && adduser -D -u 1001 -G appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/v1/health || exit 1

CMD ["node", "app.js"]
