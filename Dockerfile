FROM node:20-alpine

WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001 && \
    mkdir -p /data && chown app:nodejs /data

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=3000

# Health check for gateway integration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER app
EXPOSE 3000

CMD ["node", "dist/local-server.js"]
