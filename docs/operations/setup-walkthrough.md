# R1 环境搭建：陪同操作说明

当前实际状态见[环境搭建记录](r1-status.md)：账号、云资源和 GitHub 配置已准备，`DEPLOY_ENABLED=true`、`PREVIEW_ENABLED=false`；仅有 staging、production 两个 GitHub 环境，Vercel Token 按用户选择存仓库级 Secret。下文保留原从零搭建计划作参考，涉及 preview、Claude 认证、业务表和页面的步骤尚未交付，不应重复要求用户配置，也不作为本次合并范围。额外代码保留在草稿 PR #12 的 GitHub 分支，位置及原因已在记录中说明。

## 第一阶段：先把配置集中放进 GitHub

1. 打开仓库的 [Actions 配置页面](https://github.com/juanchaopan/lingocurrent/settings/secrets/actions)。在 **Variables** 新建仓库变量 `DEPLOY_ENABLED=false`、`PREVIEW_ENABLED=false`。它们控制现有管道是否启用，开始时保持关闭。
2. 在同一页面的 **Secrets → New repository secret** 添加 `OPENAI_API_KEY`。只保存一份仓库级 key，各环境继承，不建立同名环境级副本。审查认证在 `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_API_KEY` 中选一个 Secret，完成 [Claude GitHub App](https://github.com/apps/claude) 安装；二者都没有时当前 Claude 工作流会跳过，不能称 AI 审查已通过。
3. 打开 [Environments](https://github.com/juanchaopan/lingocurrent/settings/environments)，创建 `staging`、`production`、`preview`。前两者允许 `main` 部署；preview 的可信 workflow 从 `main` 手动运行，再校验获批准 PR 的准确 head。密钥填在各环境页面的 **Environment secrets**，公开配置填 **Environment variables**。生产手动 dispatch 是现有发布门槛，不要求购买额外功能。

每次输入都按“名称 / Variables 还是 Secrets / 仓库还是环境”确认；密钥值只在 GitHub 填，不发聊天、不写 issue。Secrets 与 Variables 的创建入口见 [GitHub Secrets 指引](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)、[Variables 指引](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables)及[环境配置](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)。

完成判据：三个环境存在，两个仓库开关为 false，所需 Secret 的**名称**已出现。检查只读名称/绑定，不显示值。

## 第二阶段：建资源、填对应值，验证 staging

1. 在 Vercel 建 `lingocurrent-staging` 和 `lingocurrent-production` 两个免费项目。两者使用根目录、Node/pnpm 的仓库锁定版本；关闭 Git 自动部署，由已检查的 GitHub 管道部署。staging 项目的 `production` target 是稳定测试地址；它与真正生产项目隔离。
2. 通过已选的 Vercel-managed Neon 建测试/生产两个独立项目。按实际区域的 Object Storage 支持情况选择区域，分别取得数据库连接、私有 bucket 和分支存储凭据。当前官方入口见 [Neon Object Storage](https://neon.com/docs/storage/get-started)；若账号/免费计划没有所需能力，记录阻塞，不换服务或开付费代替。
3. 在 Clerk 完成 Google 登录和邀请限制，分别准备测试/生产配置；配置实际回调域名。测试期使用受邀测试账号，不把生产个人数据复制到 staging/preview。
4. 把各项目页面得到的 ID/凭据按下表逐项填到 GitHub。之后只在 GitHub 修改静态配置，由可信 CI 注入部署。平台创建资源自动生成的连接信息可作为取值来源，应用配置仍以 GitHub 为准；需检查集成自动注入的值是否与它冲突。

| GitHub scope | Variables                                                                                                                                                                              | Secrets                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 仓库         | `DEPLOY_ENABLED=false`、`PREVIEW_ENABLED=false`                                                                                                                                        | `OPENAI_API_KEY`；审查认证二选一                                                               |
| staging      | `VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`、`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`、`S3_ENDPOINT`、`S3_REGION`、`S3_BUCKET`                                                                     | `VERCEL_TOKEN`、`DATABASE_URL`、`CLERK_SECRET_KEY`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY` |
| production   | 与 staging 相同的名称，填写**生产项目**的值                                                                                                                                            | 与 staging 相同的名称，填写**生产环境**的凭据                                                  |
| preview      | `VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`（staging 项目）、`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`（测试）、`NEON_PROJECT_ID`（测试项目）、`NEON_SEED_BRANCH`（非个人种子分支 ID）、`S3_BUCKET` | `VERCEL_TOKEN`、`NEON_API_KEY`、`CLERK_SECRET_KEY`（测试）                                     |

Neon 分支存储的 `token_id` 对应 `S3_ACCESS_KEY_ID`，`s3_secret_access_key` 对应 `S3_SECRET_ACCESS_KEY`，endpoint/region 使用实际返回值。preview 的 DB URL、S3 endpoint/region/分支密钥由现有 workflow 动态获取并掩码，不需要再手工建同名 Secret。Clerk publishable key 可公开，secret key 只能服务端用。

5. 由 R1 的 PR 实现并审查最薄身份/DB/测试文章路径、迁移和配置接线。确认 Actions 的 `ci`、`risk-gate`、`commit-lint` 及已配置的审查通过，高风险由维护者确认当前 head 后合并。检查 `scripts/deploy.mjs` 的明确传递清单：仅在 GitHub 新增变量不会自动传给 Vercel，build/runtime 都要按需要接入。Vercel 注入方式见[官方环境变量文档](https://vercel.com/docs/environment-variables)。
6. 准备好 staging 凭据与受审代码后，把仓库变量 `DEPLOY_ENABLED` 改为 `true`。它对之后的 deploy workflow 生效：等待一次成功的 **main push CI**；若代码已合并，可重跑该次 main CI，使其完成事件触发部署。不要手动运行 `deploy` 来“部署 staging”，当前手动入口需要 tag、目标是 production。
7. 在 [Actions](https://github.com/juanchaopan/lingocurrent/actions) 打开 `deploy` 的 staging job，确认实际部署 SHA 和 URL。用受邀账号登录→开自有测试文章→刷新验证访问保存，再用未受邀和另一测试用户检查隔离；`/api/health` 200 仅证明存活。
8. 给 preview 建无个人数据的 seed 分支并验证配置后，再把 `PREVIEW_ENABLED=true`。选择一个当前 head 已审查/CI 成功的同仓库 PR，从 main 运行 `preview`，填 `pr` 和 `approved_sha`。确认只使用测试资源；换 head 后重新批准。关闭测试 PR，核对 Vercel 部署与 Neon 子分支清理完成。

完成判据：staging 有真实写入路径和可用 URL、preview 创建/清理有证据，生产入口已配置但尚未发布。此时记录 R1-A 交接，R1 保持打开，进入合并 spike R2。

## 第三阶段：集中选型，再录入频道

1. 运行 R2 的合并 spike。TTS 提供实际样音给用户选；Speak 用用户实际录音和真实 Hobby 证据；RSS 直接从[已保存的频道候选/精确feed/已知缺口](../product/channel-candidates.md)补实测与来源条件，不重做初筛。聊天只在需要试听、录音或来源/计划选择时引导对应操作。
2. 用户选定来源后，先给一份可读配置表：Source 名/图标、Category、每个独立 feed URL、IANA 时区、每个时点篇数、是否启用。示例四批每批四篇只是候选值，不自动套给全部频道。
3. 回到 R1-B，用 R1 实现的导入入口先校验/显示差异，再写入 **staging DB**，重跑应无重复。现在没有可运行的导入命令，不让用户执行尚未实现的脚本；R1 交付时把真实命令和样例补到这里。来源/频道/计划是数据库业务数据，部署所需 Variables/Secrets 才集中在 GitHub。
4. 核对导入结果、图标、计划与来源选择一致。采集维持关闭，R3 有经过审查的 worker/鉴权和实际调度接线后，再在本配置清单中登记新增开关及 secret。当前部署 workflow 把 `SCHEDULE_ENABLED` 固定为 false，不能通过只新增同名 Variable 提前开启。

完成判据：来源/声音有明确选择，真实频道配置已校验入库，R1/R2 交付完成；随后按 R3→R4→R5 开发和 staging 验收。

## 最后如何上线

R5 汇总真实验证和恢复演练，准备版本/CHANGELOG 及发布记录；维护者确认后，用已通过 main CI 的 `vX.Y.Z` 标签，在 `deploy` 的 **Run workflow** 中选择 main 并填 tag，手动部署 production。保留已知可用标签作为应用回滚入口；应用回滚不自动撤销 SQL 或恢复已删对象。生产调度启用、测试调度仅短窗口，免费能力在执行时再次核对。
