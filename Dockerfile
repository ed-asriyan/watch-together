FROM node:18 as builder
WORKDIR /app

COPY .npmrc .
COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY svelte.config.js .
COPY tsconfig.json .
COPY vite.config.ts .
COPY static static
COPY src src

RUN npm run build

FROM scratch
COPY --from=builder /app/build /dist
ENTRYPOINT sh
