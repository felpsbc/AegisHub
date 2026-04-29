FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/schemas/package.json ./packages/schemas/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@pentesthub/web", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @pentesthub/web build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
