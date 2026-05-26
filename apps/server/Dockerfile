FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/cms/package.json apps/cms/package.json
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build --workspace @diy-store/server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
RUN mkdir -p apps/server/static/assets \
    apps/server/static/email/templates/partials \
    apps/server/static/email/test-emails

EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
