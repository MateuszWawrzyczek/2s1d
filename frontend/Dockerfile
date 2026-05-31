ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /app
RUN chown -R node:node /app

FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --no-audit --no-fund
RUN chown -R node:node /app

FROM deps AS dev-deps
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund
RUN chown -R node:node /app

FROM dev-deps AS development
COPY --chown=node:node . .
EXPOSE 5173
USER node
CMD ["npm", "run", "dev"]
