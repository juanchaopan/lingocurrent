# LingoCurrent 文档

当前环境与交接见[环境搭建记录](operations/r1-status.md)：其中明确记录“我多做了”、额外代码所在的 GitHub 分支和草稿 PR #12。额外业务代码未合并到 main，本次只交付环境事实与说明；下文路线图中的业务路径不代表已经实现或获准在本次合并。

2026-11-16 Roadmap：用户已确认[五个 issue 的合并路线图](roadmap.md)，GitHub 已创建 #6–#10 和 M0/M1；配套有[GitHub 配置逐步操作说明](operations/setup-walkthrough.md)与[频道候选交接清单](product/channel-candidates.md)，后续复用精确feed及证据，不重做初筛。Scaffold/GitHub/CI 已完成，证据见[scaffold](scaffold.md)；下一阶段为云端环境与产品实现。历史文档中“分别创建 TTS/Speak/RSS issue”的任务组织方式由本路线图覆盖，三组验证范围及各自选型门槛保留，尚未执行。

状态：Kickoff与Architecture于2026-11-15确认，Design于2026-11-16（America/Toronto）获用户“ok, finalize design”确认并定稿。

当前入口：[Design规格](design/README.md)、[最终确认与交接](design/finalization.md)、[数据模型](design/data-model.md)、[复习逐步示例](design/stateless-review.md)。全部界面源码已在[仓库mockups](design/mockups/README.md)，聊天目录只是镜像。

复习仅review_progress，无session/prompt/attempt业务表或phase；错误减轮最低0并延10分钟，正确加轮查间隔。Lookup与词卡分别拥有例句，选择索引不入库；Source/Channel稳定配置，频道任务及明细完成即删。以当前规格优先于历史变更记录。

| 文件 | 内容 |
|---|---|
| [product/vision.md](product/vision.md) | 产品定位、首版范围和约束 |
| [product/requirements.md](product/requirements.md) | REQ-001–REQ-039 用户故事和验收标准 |
| [product/provenance-review.md](product/provenance-review.md) | 需求来源及最新确认、D/E 建议及最新确认状态 |
| [product/review-defaults.md](product/review-defaults.md) | 已确认的补足规则，保留 AI 建议来源 |
| [product/intake.md](product/intake.md) | 原始需求整理、已确认决定与各轮问答记录 |
| [product/open-questions.md](product/open-questions.md) | 待明确的业务规则、约束和验证事项 |
| [product/glossary.md](product/glossary.md) | 规范词形、词义与复习阶段等业务术语 |
| [product/review-research.md](product/review-research.md) | 错后重练的初步研究依据与产品建议 |
| [product/research-notes.md](product/research-notes.md) | 语音相关初步研究；不是最终技术选型 |
| [product/voice-validation-plan.md](product/voice-validation-plan.md) | TTS spike 与 staging 语音/播放验证的分工；尚未实测 |
| [product/tts-spike-plan.md](product/tts-spike-plan.md) | TTS 音色、压缩及生成可行性 spike 计划 |
| [product/speak-spike-plan.md](product/speak-spike-plan.md) | Speak 候选在真实 Vercel Hobby 的效果与资源验证计划 |
| [product/refresh-behavior-proposal.md](product/refresh-behavior-proposal.md) | 已确认的解释缓存、收藏词卡和四选项刷新规则 |
| [product/content-source-research.md](product/content-source-research.md) | 文章来源初筛与尚待验证的条件 |
| [architecture/inputs.md](architecture/inputs.md) | 架构访谈指标、容量参考与决策进度 |
| [architecture/free-tier-feasibility.md](architecture/free-tier-feasibility.md) | 免费 Vercel 边界及服务端语音候选；尚未实测 |
| [architecture/background-and-resource-plan.md](architecture/background-and-resource-plan.md) | 同事务入任务、崩溃恢复、免费配额及自动淘汰文章的具体提案 |
| [architecture/speech-candidates.md](architecture/speech-candidates.md) | TTS/Speak 候选研究次序，尚无实测 |
| [architecture/database-options.md](architecture/database-options.md) | 数据库供应商/管理入口比较，已选 Vercel-managed Neon |
| [architecture/object-storage-options.md](architecture/object-storage-options.md) | Neon/Vercel 对象存储比较，已选 Neon |
| [adr/0001-modular-monolith.md](adr/0001-modular-monolith.md) | 已接受的模块化单体选择 |
| [adr/0002-nextjs-web.md](adr/0002-nextjs-web.md) | 已接受的 Next.js + TypeScript 选择 |
| [adr/0003-background-consistency.md](adr/0003-background-consistency.md) | 已接受临时任务表、事务和完成即删除 |
| [adr/0004-article-retention.md](adr/0004-article-retention.md) | 历史仅文章策略，已由 ADR-0005 替代 |
| [adr/0005-audio-cache-retention.md](adr/0005-audio-cache-retention.md) | 已接受文章/例句音频 FIFO 及个人数据保留边界 |
| [adr/0006-data-access-and-validation.md](adr/0006-data-access-and-validation.md) | 已接受 Drizzle/Zod |
| [adr/0007-neon-data-platform.md](adr/0007-neon-data-platform.md) | 已接受 Neon 数据库/对象存储、Vercel 应用计算 |
| [adr/0008-package-and-migrations.md](adr/0008-package-and-migrations.md) | 已接受 pnpm 及版本化 SQL 迁移 |
| [adr/0009-web-technical-details.md](adr/0009-web-technical-details.md) | 已接受前端状态、样式与分层 |

Kickoff、Architecture、Design及scaffold/GitHub准备均已完成。当前为roadmap：完整首版按五个issue组织；引擎/来源、实际Free容量及真机结果仍待取证，不视为文档或骨架完成即已验证。

| 已确认Design | 内容 |
|---|---|
| [design/experience.md](design/experience.md) | 紧凑工作区、导航/阅读/解释/词库/三模式复习、令牌与可访问性 |
| [design/data-model.md](design/data-model.md) | 数据表、身份/键/索引、快照与删除矩阵 |
| [design/api-contracts.md](design/api-contracts.md) | REST、搜索/分页/固定队列、幂等与模型端口 |
| [design/state-machines.md](design/state-machines.md) | 复习常量/错后短练、调度/任务/发布/清理、用量恢复 |
| [design/validation.md](design/validation.md) | 39条需求追踪、实际检查与工程验证门槛 |

| 架构汇总/后续决策 | 内容 |
|---|---|
| [architecture/overview.md](architecture/overview.md) | 完整架构总览：指标、分层、组件、交互、部署、数据和故障 |
| [architecture/review.md](architecture/review.md) | 34 条需求覆盖、漏洞检查与后续验证门槛 |
| [adr/0010-visual-and-testing.md](adr/0010-visual-and-testing.md) | 已接受设计稿/Storybook/Vitest/RTL/Playwright |
| [adr/0011-api-and-search.md](adr/0011-api-and-search.md) | 已接受 HTTP/JSON REST 与 PostgreSQL 英文全文检索 |
| [adr/0012-environments-and-release.md](adr/0012-environments-and-release.md) | 已接受四环境、自动 staging/手动生产及配置隔离 |
| [adr/0013-free-recovery.md](adr/0013-free-recovery.md) | 已接受 Neon Free 的较弱恢复，不保证原 24 小时 RPO/RTO |
| [adr/0014-observability.md](adr/0014-observability.md) | 条件核实后采用 Vercel 免费 OpenTelemetry/Tracing |
| [adr/0015-consistency-and-boundaries.md](adr/0015-consistency-and-boundaries.md) | 已接受模块边界、事务/去重与文章/音频删除对账 |
| [adr/0016-speech-engines-pending-spike.md](adr/0016-speech-engines-pending-spike.md) | 引擎与音色提议，须分别 spike 后定 |
| [adr/0017-input-presentations-and-word-audio.md](adr/0017-input-presentations-and-word-audio.md) | 鼠标/触控展示及词头音频缓存 |
| [adr/0018-lean-lookup-and-vocabulary.md](adr/0018-lean-lookup-and-vocabulary.md) | 查词/词卡精简，顶部最新五表规则覆盖历史方案 |
| [adr/0019-stateless-review-and-round-rollback.md](adr/0019-stateless-review-and-round-rollback.md) | 复习只存进度、轮次回退及通用请求去重 |
