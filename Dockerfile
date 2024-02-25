FROM node:18 as base
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

FROM base as builder
RUN npm run build

FROM base as clean-db
COPY clean-db.js .
ENV DIFF 0
CMD npm run clean-db -- $DIFF

FROM scratch as app
COPY --from=builder /app/build /dist
ENTRYPOINT sh
