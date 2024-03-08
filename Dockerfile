FROM node:18 as dev

FROM dev as base

WORKDIR /app

COPY .npmrc .
COPY package.json .
COPY package-lock.json .

RUN npm ci
# https://github.com/npm/cli/issues/4828#issuecomment-1972072806
RUN npm i -O @rollup/rollup-linux-x64-gnu @rollup/rollup-linux-arm64-gnu

COPY svelte.config.js .
COPY tsconfig.json .
COPY tsconfig.node.json .
COPY vite.config.ts .
COPY index.html .
COPY static static
COPY src src

FROM base as builder
RUN npm run build

FROM base as clean-db
COPY clean-db.js .
ENV DIFF 0
CMD npm run clean-db -- $DIFF

FROM scratch as app
COPY --from=builder /app/dist /dist
ENTRYPOINT sh
