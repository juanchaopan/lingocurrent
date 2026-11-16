# Deployment setup

No hosted environments or credentials have been created. Workflows are disabled until repository variable DEPLOY_ENABLED=true is set deliberately after setup.

## Environments and release

Create separate free Vercel projects lingocurrent-staging and lingocurrent-production, and separate Neon projects for testing and production. Use the repository root, Node 24, pnpm install --frozen-lockfile and pnpm build.
Disable automatic Vercel Git deployments in both projects to avoid bypassing checked workflows.
The staging project uses its Vercel production target for its own stable staging URL; it is separate from the actual production project.

GitHub ci runs all checks on main and PRs. deploy waits for successful main push CI before deploying that exact commit to staging.
Production requires workflow_dispatch from main with an existing vX.Y.Z tag. The resolver verifies that the tag points to a main ancestor with successful main push CI; deployment checks out that exact commit.
Jobs serialize per environment and do not cancel migrations in progress.
Use the same manual tag workflow for application rollback; reviewed SQL must remain compatible with old app versions.

Create GitHub environments staging and production. Required reviewers are optional if your repository/plan supports them; the accepted release gate is manual dispatch, not a paid reviewer feature.
Set allowed deployment branches to main for both environments.
Before enabling deployment, connect each environment's Vercel and Neon IDs and secrets below.
The production build/CLI command uses environment-scoped credentials; it never runs on untrusted PR code.

## Variables and secrets

| Scope                | Variables                                                                                              | Secrets                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Repository           | DEPLOY_ENABLED (false initially)                                                                       | OPENAI_API_KEY (one shared key, inherited by environment jobs)                       |
| staging / production | VERCEL_ORG_ID, VERCEL_PROJECT_ID, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, S3_ENDPOINT, S3_REGION, S3_BUCKET | VERCEL_TOKEN, DATABASE_URL, CLERK_SECRET_KEY, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY |

Keep production and testing Clerk/DB/storage credentials isolated. Only public Clerk configuration belongs in NEXT_PUBLIC_*.
Neon storage credentials are branch-scoped: token_id maps to S3_ACCESS_KEY_ID and s3_secret_access_key to S3_SECRET_ACCESS_KEY.
Use forcePathStyle for the S3 adapter and the returned storage endpoint/region. See [Neon storage setup](https://neon.com/docs/storage/get-started) and [authentication](https://neon.com/docs/storage/authentication).
Region support, Range requests, physical capacity release, private access and recovery still require live integration evidence.

## Migrations and schedules

pnpm db:generate creates SQL from the schema; review and commit it before deployment.
pnpm db:migrate requires DATABASE_URL. With no schema migrations yet it reports that fact; it does not invent placeholder tables.
Deployment runs migrations once before app deployment; use expand/migrate/contract changes and take the available snapshot before sensitive changes.

Schedules remain explicitly disabled. Implement the worker, authenticated invocation and the accepted 15-minute wake-up using the later roadmap issue and current free-platform validation. Do not add an active cron for a nonexistent endpoint.

## PR previews

preview.yml uses a read-only PR trigger and requires the repository owner's approval of a specific reviewed head SHA in workflow_dispatch before any preview receives credentials. The approval cannot carry forward to a changed head.
It provisions a temporary Neon child of a dedicated nonpersonal seed branch, gets branch-scoped storage credentials and deploys a Vercel preview in the staging project.
Closing the PR removes matching Vercel preview deployments and the Neon child branch through a base-branch cleanup workflow.
Set PREVIEW_ENABLED=true only after configuring the preview environment, seed branch, bucket and testing the lifecycle.
This explicit approval protects the shared OpenAI/Clerk keys from unreviewed code (ADR-0012); automatic untrusted credentialed previews are not enabled.
Fork PRs do not receive credentials. The reviewer must first bring trusted code into a reviewed same-repository branch.
Seed data must contain no production users or personal learning data. A preview inherits only the seed's objects, not the staging/production personal data.
Production is never used as a preview parent.

References: [Vercel CLI deploy](https://vercel.com/docs/cli/deploy), [Neon branch action](https://github.com/neondatabase/create-branch-action).
