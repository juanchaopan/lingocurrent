FROM node:24.22.1-bookworm-slim AS node
FROM mcr.microsoft.com/playwright:v1.65.1-noble
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && ln -sf ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack && corepack enable && corepack prepare pnpm@10.24.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV CI=1 NEXT_TELEMETRY_DISABLED=1 STORYBOOK_DISABLE_TELEMETRY=1
RUN pnpm build
CMD ["pnpm", "test:e2e"]
