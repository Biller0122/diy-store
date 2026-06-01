FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/realtime-server/package.json apps/realtime-server/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace @diy-store/server --workspace @diy-store/realtime-server --legacy-peer-deps

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build --workspace @diy-store/server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SOCKET_PORT=3002

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/realtime-server/package.json ./apps/realtime-server/package.json

EXPOSE 3002
CMD ["node", "apps/server/dist/realtime.js"]
