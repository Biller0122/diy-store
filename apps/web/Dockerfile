FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/cms/package.json apps/cms/package.json
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_VENDURE_SHOP_API=/shop-api
ARG NEXT_PUBLIC_VENDURE_ADMIN_API=/admin-api
ARG NEXT_PUBLIC_SITE_URL=https://example.com
ENV NEXT_PUBLIC_VENDURE_SHOP_API=$NEXT_PUBLIC_VENDURE_SHOP_API
ENV NEXT_PUBLIC_VENDURE_ADMIN_API=$NEXT_PUBLIC_VENDURE_ADMIN_API
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build --workspace @diy-store/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
