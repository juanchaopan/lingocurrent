# AI review setup

Local scaffold setup installs the setup-ai-review skill's CI, commit checks, risk classification, AI/security review workflows, issue/PR templates, review eval runner and formatting hook.
Project-specific Next.js rules, pnpm commands, GitHub Flow and sensitive paths are configured. The generator's Next.js AGENTS block is preserved.

The reviewer checks user isolation, no hidden target/answer leakage, transaction rechecks after external calls, no resurrection of deleted cards, stateless review progression, complete-before-publish articles and FIFO cache retention.
Existing design/architecture documents remain the source of truth. REVIEW.md keeps the skill's anti-bloat criteria.

## GitHub setup remaining

After the owner approves repository name and visibility, push the initial scaffold and workflow files to main.
Install the [Claude GitHub App](https://github.com/apps/claude).
Set either CLAUDE_CODE_OAUTH_TOKEN (from your Claude subscription) or ANTHROPIC_API_KEY using GitHub's secret UI/gh; never paste keys into chat.
Without that setup the AI review workflows cannot run successfully.

With owner approval, enable auto-merge and automatic branch deletion, create type:feature/type:bug/type:refactor/type:chore/type:spike labels, and apply the skill's default/main branch ruleset where the repository plan supports it.
Required checks: ci, risk-gate, commit-lint; resolve review threads before merging.
Medium/high-risk changes require maintainer human-reviewed confirmation for the current head; code pushes invalidate it.
Repository visibility and plan determine which GitHub rules are enforceable; verify when applying, never silently upgrade.

Dependency updates cover root pnpm/npm packages and GitHub Actions.
The local commit-msg hook is enabled with git config core.hooksPath .githooks and its executable index bit must be preserved.
To try the workflow, submit a small documentation PR after the GitHub setup is finished.

Skill source: C:/Users/juanc/.agents/skills/setup-ai-review/SKILL.md.
