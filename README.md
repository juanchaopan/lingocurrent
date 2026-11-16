# LingoCurrent

English reading, vocabulary collection, and practice. This repository currently contains the application scaffold; product features and speech/source spikes follow the roadmap.

Use Node **24.22.1** and **pnpm 10.24.0**.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The shell and `/api/health` work without cloud credentials.
Copy `.env.example` to `.env.local` when implementing cloud integrations; never commit real credentials.

```powershell
pnpm format:check
pnpm lint
pnpm arch
pnpm typecheck
pnpm test
pnpm build
pnpm build-storybook
pnpm test:e2e
pnpm duplication
```

`pnpm storybook` opens the five component states on port 6006.
`pnpm test` includes Vitest unit tests and Chromium story/accessibility tests.
Run `pnpm exec playwright install chromium` if the browser is missing.

For the two-replica local environment, start Docker Desktop, then:

```powershell
docker compose -f infra/docker-compose.yml up --build -d --wait
```

Open http://localhost:3000; the `X-Local-Upstream` response header identifies each replica. Postgres is on 5432; local S3 on 9000. These ports bind only to localhost. See [operations](docs/operations/local.md) for credentials, volumes, screenshots, and cleanup.

Architecture boundaries are enforced by dependency-cruiser. Routes use application services; features split pages/components/data-access; server modules own services/repository ports/domain. See [architecture](docs/architecture/overview.md), [design](docs/design/finalization.md), and [engineering checks](docs/scaffold.md).

Deployment uses separate free Vercel projects for staging and production, with explicit manual production releases. No cloud resources have been provisioned. See [deployment setup](docs/operations/deployment.md) and [review setup](docs/operations/review-setup.md).

Run `/roadmap` next to create implementation and TTS/Speak spike issues.
