FROM node:24-slim

RUN npm install -g pnpm@11
WORKDIR /app

COPY . .
RUN --mount=type=cache,target=/pnpm-store pnpm install --frozen-lockfile --store-dir /pnpm-store

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@service-center/worker", "start"]
