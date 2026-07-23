# syntax=docker/dockerfile:1
FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS build

WORKDIR /app

RUN corepack enable \
    && pnpm config set store-dir /pnpm/store

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM caddy:2.11.4-alpine@sha256:98eb57d882ccd5213d1688764db10c1ca2c58a1ca3a6717a3411ad798f7a423a AS runtime

ARG RELEASE=development
LABEL org.opencontainers.image.source="https://github.com/I0I-I0I/project-reader" \
    org.opencontainers.image.revision="$RELEASE"

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
RUN mkdir -p /srv/health \
    && printf '%s\n' "$RELEASE" > /srv/health/version \
    && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

EXPOSE 80
