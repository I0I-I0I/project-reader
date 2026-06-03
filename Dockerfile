FROM node:24 AS build

WORKDIR /app

RUN corepack enable
RUN pnpm config set store-dir /pnpm/store

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --prod --ignore-scripts

FROM node:24-slim AS runtime

WORKDIR /app

COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/server.js ./server.js

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

USER node

EXPOSE 3000
CMD ["node", "server.js"]
