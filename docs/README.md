# LingoCurrent 文档

项目目录：`C:\Users\juanc\AI Projects\english`。产品暂名 LingoCurrent，由 AI 按用户授权命名；不创建下一级项目目录。

Kickoff 与 architecture 均已于 2026-11-15（America/Toronto）完成确认。最终删除规则：文章当前音频淘汰时文章同步删除，例句只删音频、文本留表、下次点击朗读重建。语音引擎仍待 TTS/Speak 分别 spike；尚无应用、部署或实测。

| 文件 | 内容 |
|---|---|
| [product/vision.md](product/vision.md) | 产品定位、首版范围和约束 |
| [product/requirements.md](product/requirements.md) | REQ-001–REQ-034 用户故事和验收标准 |
| [product/provenance-review.md](product/provenance-review.md) | 34 条需求逐条来源、D/E 建议及最新确认状态 |
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

/architect 已定稿：整体设计见 overview，覆盖及风险见 review。Vercel/Neon 坚持 Free；任务成功即删；音频 FIFO/95%/90%，文章/音频共同删除，例句及个人学习文本保留；免费 OTel 与弱恢复边界已明确。下一步进入 Design，再 scaffold 搭骨架并准备/推送 GitHub 仓库，随后 roadmap 创建任务。TTS/Speak 保持提议，由 roadmap 分别创建 type:spike issue，执行后再实现依赖它们的功能；完整集成与 D-014 留 staging。

| 架构汇总/后续决策 | 内容 |
|---|---|
| [architecture/overview.md](architecture/overview.md) | 完整架构总览：指标、分层、组件、交互、部署、数据和故障 |
| [architecture/review.md](architecture/review.md) | 34 条需求覆盖、漏洞检查与后续验证门槛 |
| [adr/0010-visual-and-testing.md](adr/0010-visual-and-testing.md) | 已接受设计稿/Storybook/Vitest/RTL/Playwright |
| [adr/0011-api-and-search.md](adr/0011-api-and-search.md) | 已接受 HTTP/JSON REST 与 PostgreSQL 英文全文检索 |
| [adr/0012-environments-and-release.md](adr/0012-environments-and-release.md) | 已接受四环境、自动 staging/手动生产及配置隔离 |
| [adr/0013-free-recovery.md](adr/0013-free-recovery.md) | 已接受 Neon Free 的较弱恢复，不保证原 24 小时 RPO/RTO |
| [adr/0014-observability.md](adr/0014-observability.md) | 条件核实后采用 Vercel 免费 OpenTelemetry/Tracing |
| [adr/0015-consistency-and-boundaries.md](adr/0015-consistency-and-boundaries.md) | 已接受模块边界、版本/幂等与文章/音频删除对账 |
| [adr/0016-speech-engines-pending-spike.md](adr/0016-speech-engines-pending-spike.md) | 引擎与音色提议，须分别 spike 后定 |
