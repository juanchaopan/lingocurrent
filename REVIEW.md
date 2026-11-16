# Review standard

## Comment language

English.

## What constitutes a defect

- One user can see another user's private data, credentials, query cache or learning state.
- Review stores sessions/prompts/attempts or advances twice, counts technical failure as wrong, or restores a deleted card.
- Article publication precedes complete audio/timeline; eviction deletes personal text/progress or uses LRU instead of FIFO.
- AI refresh occurs implicitly, shared state crosses requests, or routes bypass application/module ownership.
- Unreviewed preview code receives secrets, production deploy bypasses manual tagged release, or setup commands do not work.

## Focus

Trace triggering inputs and resulting behavior. Check accepted ADRs and current design, transaction rechecks, request deduplication, fail-closed authorization and server-only boundaries. Confirm meaningful tests for consequential changes. Keep documentation and runnable commands consistent.

## 补丁味和臃肿

AI 写的代码容易越改越像打补丁。看到下面这些要报：

- [Important] 往已有函数里追加条件分支和参数来支持新情况，函数越来越长，而不是调整结构。
- [Important] 新代码和已有代码重复，或者同一件事有了两种做法。
- [Important] 留下死代码、注释掉的代码、不再使用的参数和分支、只为兼容旧实现的代码。
- [Important] 为只用一次的情况做了过度的抽象或配置化。
- [Nit] 注释写成了修改记录（"改为…""新增…""之前…"），或者描述的是改动过程而不是代码本身。

## Do not report

Formatting handled by tools, speculative issues without a trigger, or style preferences presented as defects. At most 3 nits.

## Skip generated artifacts

.next/, node_modules/, storybook-static/, test-results/, playwright-report/, pnpm-lock.yaml, next-env.d.ts, and archived design mockup HTML.

## Evidence

Each finding names the file, line, trigger and consequence. Inspect relevant callers before claiming a defect. Group instances of the same issue. Begin the review with the number of findings; report zero when no actionable defects are found.
