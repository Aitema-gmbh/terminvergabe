# aitema|Termin - Multi-Stage Build (SvelteKit)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
LABEL org.opencontainers.image.title="aitema|Termin"
LABEL org.opencontainers.image.description="OZG-konforme Terminvergabe fuer Kommunen"
LABEL org.opencontainers.image.source="https://github.com/Aitema-gmbh/terminvergabe"
LABEL org.opencontainers.image.licenses="AGPL-3.0"

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 sveltekit && \
    adduser --system --uid 1001 sveltekit

COPY --from=builder --chown=sveltekit:sveltekit /app/build ./build
COPY --from=builder /app/package.json ./
RUN npm install --omit=dev --legacy-peer-deps

USER sveltekit
EXPOSE 3000
ENV PORT=3000 HOST=0.0.0.0
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:3000 || exit 1
CMD ["node", "build"]
