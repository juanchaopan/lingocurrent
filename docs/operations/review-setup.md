# AI review setup

Local scaffold setup installs the setup-ai-review skill's CI, commit checks, risk classification, AI/security review workflows, issue/PR templates, review eval runner and formatting hook.
Project-specific Next.js rules, pnpm commands, GitHub Flow and sensitive paths are configured. The generator's Next.js AGENTS block is preserved.

The reviewer checks user isolation, no hidden target/answer leakage, transaction rechecks after external calls, no resurrection of deleted cards, stateless review progression, complete-before-publish articles and FIFO cache retention.
Existing design/architecture documents remain the source of truth. REVIEW.md keeps the skill's anti-bloat criteria.

## Published GitHub setup

The owner approved the review standards and public repository on 2026-11-16. The scaffold and existing design history are published at https://github.com/juanchaopan/lingocurrent on main.
Install the [Claude GitHub App](https://github.com/apps/claude).
Set either CLAUDE_CODE_OAUTH_TOKEN (from your Claude subscription) or ANTHROPIC_API_KEY using GitHub's secret UI/gh; never paste keys into chat.
Either credential is sufficient. When neither secret is available, Claude code review,
security review, and the @claude job report skipped. The shared credential check
reports only availability, never credential values, and does not check out PR code.
Configured credentials still run Claude normally; authentication or review errors
remain failures. The required ci, risk-gate, and commit-lint checks still run.

Auto-merge, automatic merged-branch deletion, and type:feature/type:bug/type:refactor/type:chore/type:spike labels are enabled. The approved default/main branch ruleset is activated at setup completion. GitHub Free supports rulesets on this public repository.
Required checks: ci, risk-gate, commit-lint; resolve review threads before merging.
Medium/high-risk changes require maintainer human-reviewed confirmation for the current head; code pushes invalidate it.
Repository visibility and plan determine which GitHub rules are enforceable; verify when applying, never silently upgrade.

Dependency updates cover root pnpm/npm packages and GitHub Actions.
The local commit-msg hook is enabled with git config core.hooksPath .githooks and its executable index bit must be preserved.
To try the workflow, submit a small documentation PR after the GitHub setup is finished.

Skill source: C:/Users/juanc/.agents/skills/setup-ai-review/SKILL.md.

Repository protection requires pull requests, passing ci/risk-gate/commit-lint, resolved review threads, no force pushes, and no deletion of protected branches. No paid plan or upgrade was used.
