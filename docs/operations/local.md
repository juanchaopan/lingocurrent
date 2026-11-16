# Local development and verification

## Native development

Node 24.22.1, pnpm 10.24.0; install using the committed lockfile. Run `pnpm dev`.
The generated scaffold renders a simple workspace shell, not the complete approved product mockup.
Authentication, business APIs, migrations, speech engines, stores and external integrations are roadmap work.

## Compose

`docker compose -f infra/docker-compose.yml config --quiet` validates the definition without a running engine.
`docker compose -f infra/docker-compose.yml up --build -d --wait` starts two app replicas behind Nginx, Postgres 17, Adobe S3Mock, a local test bucket and a fail-closed AI stub.
No Clerk/AI account is bypassed: only the public scaffold shell and liveness endpoint exist.
Real private routes must add authorization with their implementation issues.

Optional overrides: copy `infra/.env.example` to `infra/.env` and pass `--env-file infra/.env`.
Default local credentials are development fixtures: DB lingocurrent / local-only, S3 local-s3 / local-s3-secret (dummy values accepted by the simulator).
Data uses named volumes. `docker compose -f infra/docker-compose.yml down` stops containers and preserves data.
Do not add `--volumes` unless intentionally discarding local data.

The AI stub only responds successfully at /health. Other calls return 503 until deterministic fixtures are implemented.
The health endpoint is liveness only; a successful response does not prove DB, storage, identity, AI or worker readiness.
The proxy's X-Local-Upstream header distinguishes app addresses. Repeat requests to /api/health to check balancing.

## Tests and screenshots

Vitest unit and Storybook browser/accessibility tests run via `pnpm test`.
Build before Playwright: `pnpm build`, then `pnpm test:e2e`.
Screenshot baselines use the same Linux Playwright **1.65.1 noble** image as CI.

Do not mount Windows node_modules into Linux. Use the repository's `infra/visual.Dockerfile`:

```powershell
docker build -f infra/visual.Dockerfile -t lingocurrent-visual .
docker run --rm --ipc=host --name lingocurrent-visual lingocurrent-visual
```

To intentionally regenerate a baseline, run the image with `pnpm exec playwright test --update-snapshots`, then copy /app/e2e/shell.spec.ts-snapshots out of the stopped container and review the image.
Windows screenshots are separate local evidence and do not replace the committed Linux baseline.

The official MinIO image tags were unavailable when checked. The local simulator uses the verified Adobe S3Mock 5.2.3 image instead. It does not validate presigned signatures or expiration; production access-control tests must run against real Neon. [Official simulator behavior](https://github.com/adobe/S3Mock#limitations).
