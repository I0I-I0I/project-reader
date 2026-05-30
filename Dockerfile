FROM node:22 AS build

WORKDIR /app

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-slim AS runtime

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN corepack enable && pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build"]
