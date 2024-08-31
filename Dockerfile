FROM node:18 as dev

FROM dev as base

WORKDIR /app

COPY .npmrc .
COPY package.json .
COPY package-lock.json .

RUN npm ci
# https://github.com/npm/cli/issues/4828#issuecomment-1972072806
RUN npm i --no-save -O @rollup/rollup-linux-x64-gnu @rollup/rollup-linux-arm64-gnu

COPY svelte.config.js .
COPY tsconfig.json .
COPY tsconfig.node.json .
COPY vite.config.ts .
COPY index.html .
COPY static static
COPY src src

FROM base as builder
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTHDOMAIN
ARG VITE_FIREBASE_DATABASE_URL
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORE_BUCKET
ARG VITE_FIREBASE_MESSAGES_SENDER_ID
ARG VITE_VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_USERNAMES
ARG VITE_REACTIONS
ARG VITE_URL
ARG VITE_DEFAULT_VIDEO
ARG VITE_ICE_SERVERS_JSON
ARG VITE_WEB_TORRENT_TRACKERS
ARG VITE_API_HLS_PROXY_URL
ARG VITE_API_HTTP_PROXY_URL
ARG VITE_API_VIDEO_EXTRACTOR_URL
ARG VITE_SENTRY_DSN
ARG VITE_ANALYTICS_MEASHUREMENT_ID
ARG VITE_URL_EXAMPLES
ARG NODE_ENV

RUN npm run build -- --mode $NODE_ENV

FROM scratch as bundle
COPY --from=builder /app/dist /dist
ENTRYPOINT sh

FROM nginx as app
COPY --from=bundle /dist /var/www/html/
COPY nginx.conf /etc/nginx/nginx.conf
