# LingoCurrent

English reading and practice for invited learners. Approved requirements and design are indexed in docs/README.md.

## Components

One root Next.js 16.4.6 / React 19.3.0 / TypeScript 6 application, Node 24.22.1, pnpm 10.24.0. Layers: src/app, src/features, src/client, src/server, src/shared.

## Self checks

Run pnpm format:check, pnpm lint, pnpm arch, pnpm typecheck, pnpm test, pnpm build, pnpm build-storybook, pnpm test:e2e and pnpm duplication. Build before E2E; screenshots use the pinned Linux image. Report actual results, not assumed success.

## Standards

Read .claude/rules/web.md and server.md. Never weaken lint/architecture checks to accommodate a violation. Public contracts use Zod; secrets and personal data stay server-side. New consequential logic needs behavior-focused tests.

## 写代码的方式

- 改完的代码要读起来像一次写成的。注释只说明现在的代码做什么、为什么这样设计；不写"改为…""新增…""修复…""原来是…"这类修改记录，修改历史留给提交信息。
- 不留死代码、注释掉的代码、不再使用的参数和分支，也不为兼容旧写法保留代码，除非有调用方确实还在用。
- 新需求放不进现有结构时，先调整结构，再加新功能：先做一个不改变行为的重构提交（测试保持通过），再做功能提交。不要往旧函数里不断追加 if 和参数。
- 同样的逻辑出现第二次时考虑提取，第三次时必须提取。
- 函数和文件变长、变复杂时拆开。复杂度和长度的上限由 lint 检查，重复代码由 jscpd 检查。
- 改动会大面积影响现有的类、接口或模块划分时，先停下来，用 /change 评估设计影响，不要边写边改。

## Goals and scope

Implement the approved modular monolith through roadmap issues. Scaffold does not implement product features or settle pending speech engines. No microservices, second queue, hidden learning history or business versions.

## Branches and commits

GitHub Flow: main is the integration branch; create codex/<issue-or-topic> branches and merge by PR. Conventional Commits, one concern per commit. Preserve commits with merge commits; enable auto-merge after repository setup and maintainer approval. Initial bootstrap is prepared on codex/scaffold and published only with owner approval. Medium/high risk needs current-head human review.

## Workflow

Use the repository open-pr command for checks and review. Keep SQL migrations compatible with app rollback. Production is manual from a CI-validated version tag; never enable parallel automatic production deployment. Consult /change for material requirement/architecture changes and /spike for uncertain technology.

## Documentation

AGENTS.md is the agent entry point; REVIEW.md is the review standard. docs/README.md indexes the approved product, architecture, ADRs and design. docs/scaffold.md records scaffold evidence; docs/operations contains local, deployment and review setup.
