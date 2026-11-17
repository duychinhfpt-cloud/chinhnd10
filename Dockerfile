FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /srv

# Cài thư viện trước để Docker cache lại khi chỉ sửa code
COPY package.json package-lock.json ./
# Secret "ca" là tuỳ chọn: chỉ dùng khi build sau proxy có chứng chỉ riêng.
# Build bình thường (docker compose up --build) không cần, không lưu gì vào image.
RUN --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server.js ./
COPY server ./server
COPY app ./app
COPY design ./design
COPY admin ./admin

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.js"]
