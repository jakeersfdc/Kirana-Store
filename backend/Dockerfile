# syntax=docker/dockerfile:1.6
# ----------- Stage 1: deps -----------
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ----------- Stage 2: runner -----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--max-old-space-size=512

RUN apk add --no-cache dumb-init wget \
 && addgroup -S nodejs -g 1001 \
 && adduser  -S kirana -u 1001 -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=kirana:nodejs package.json ./
COPY --chown=kirana:nodejs src ./src
COPY --chown=kirana:nodejs public ./public

RUN mkdir -p /app/data /app/logs && chown -R kirana:nodejs /app/data /app/logs
USER kirana

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
