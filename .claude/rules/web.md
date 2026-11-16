---
paths:
  - 'src/app/**'
  - 'src/client/**'
  - 'src/features/**'
  - 'src/shared/**'
  - 'src/styles/**'
---

# LingoCurrent React / Next.js rules

Adapted from the scaffold React TypeScript standards to ADR-0008–0010.
Run `pnpm lint`, `pnpm arch`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

- App Router owns routes; do not add React Router. Routes call application use cases, never SQL/repositories.
- Feature pages fetch and orchestrate through data-access. Presentation components receive props/callbacks and cannot fetch, access global stores, or depend on pages.
- Features do not import other features; shared contracts/UI/pure utilities cannot depend on business modules.
- TanStack Query owns server data. Include user identity and query parameters in keys; clear personal caches when identity changes. Automatic refetch must not generate AI content.
- Create each QueryClient and Zustand store within a request/client provider, never as shared server user state. Add player/overlay stores with their implementation issues.
- Use function components, strict types, stable IDs for keys, and effects only for external synchronization.
- Tailwind uses semantic tokens from src/styles/tokens.css, extracted from the approved mockup. Use semantic HTML, keyboard access, and visible focus.
- Public NEXT_PUBLIC_* values are bundled; secrets stay in server-only adapters.
- Presentational stories cover normal, empty, loading, error, and long content. Tests assert visible behavior.
- Complexity <= 10, depth <= 3, functions <= 100 nonblank/noncomment lines, enforced by ESLint.
- Playwright Linux screenshot baselines use the exact CI image; Windows images are local evidence only.
