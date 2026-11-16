---
paths:
  - 'src/server/**'
  - 'src/app/api/**'
  - 'drizzle/**'
---

# LingoCurrent server rules

Adapted from the scaffold Node TypeScript standards to the approved modular monolith.

- HTTP routes validate contracts and call application use cases. Application coordinates module public services and transactions.
- Each module owns services, repository ports and pure domain. Modules cannot import other modules or infrastructure; application supplies ports.
- Repository ports cannot depend on services. Domain depends only on its domain and pure shared utilities, never framework/SDK code.
- Infrastructure implements Drizzle, Clerk, S3, sources, AI and tracing. Only src/server/infrastructure/bootstrap.ts assembles concrete dependencies; application may import this exact path.
- Server runtime entry points import server-only. Schema declarations are tool-readable and never imported by client code.
- External input and AI output are unknown until validated with Zod. No any, secrets in logs, or unchecked SQL interpolation.
- Each repository writes only its owner's tables; cross-module changes use application-controlled database transactions.
- AI/object calls happen outside database transactions; lock/recheck current data before commit. Late callbacks never upsert deleted cards.
- Review persists only review_progress; no sessions, prompts, attempts, phase or business version fields. Follow ADR-0019.
- Pending jobs finish by deletion; do not add another queue. Article eviction deletes its text and visits, while all personal learning text/progress remains.
- SQL migrations are generated, reviewed and committed, then run once through a controlled deployment step. Never schema push at startup.
- Complexity <= 10, depth <= 3, functions <= 100 lines; lint/type/architecture checks enforce the same commands in local hooks and CI.
