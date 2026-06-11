FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace @diy-store/web --legacy-peer-deps

FROM deps AS builder
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_VENDURE_SHOP_API=/shop-api
ARG NEXT_PUBLIC_VENDURE_ADMIN_API=/admin-api
ARG NEXT_PUBLIC_SITE_URL=https://example.com
ARG NEXT_PUBLIC_SOCKET_URL=
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ARG NEXT_PUBLIC_APP_PORTAL=customer
ARG APP_PORTAL=$NEXT_PUBLIC_APP_PORTAL
ARG INTERNAL_VENDURE_SHOP_API=http://server:3001/shop-api
ARG INTERNAL_VENDURE_ADMIN_API=http://server:3001/admin-api
ARG INTERNAL_VENDURE_ASSETS=http://server:3001/assets/:path*
ARG INTERNAL_VENDURE_MAILBOX=http://server:3001/mailbox/:path*
ENV NEXT_PUBLIC_VENDURE_SHOP_API=$NEXT_PUBLIC_VENDURE_SHOP_API
ENV NEXT_PUBLIC_VENDURE_ADMIN_API=$NEXT_PUBLIC_VENDURE_ADMIN_API
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_APP_PORTAL=$NEXT_PUBLIC_APP_PORTAL
ENV APP_PORTAL=$APP_PORTAL
ENV INTERNAL_VENDURE_SHOP_API=$INTERNAL_VENDURE_SHOP_API
ENV INTERNAL_VENDURE_ADMIN_API=$INTERNAL_VENDURE_ADMIN_API
ENV INTERNAL_VENDURE_ASSETS=$INTERNAL_VENDURE_ASSETS
ENV INTERNAL_VENDURE_MAILBOX=$INTERNAL_VENDURE_MAILBOX
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN npm run build --workspace @diy-store/web

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV APP_PORTAL=customer
ENV BIREFNET_MODEL_DIR=/opt/diy-store-models
ENV BIREFNET_ONNX_INPUT_SIZE=1024
ENV BIREFNET_ONNX_OPTIMIZATION=basic
ENV BIREFNET_ONNX_THREADS=2

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
    && pip3 install --break-system-packages --no-cache-dir numpy pillow onnxruntime \
    && mkdir -p /opt/diy-store-models \
    && python3 -c "import urllib.request; urllib.request.urlretrieve('https://huggingface.co/onnx-community/BiRefNet_lite-ONNX/resolve/main/onnx/model.onnx', '/opt/diy-store-models/birefnet_lite.onnx')" \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/scripts ./apps/web/scripts
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
