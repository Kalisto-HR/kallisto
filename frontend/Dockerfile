FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_SESSION_IDLE_TIMEOUT_MINUTES=60
ENV VITE_SESSION_IDLE_TIMEOUT_MINUTES=$VITE_SESSION_IDLE_TIMEOUT_MINUTES

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
