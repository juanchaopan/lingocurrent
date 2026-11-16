# LingoCurrent 文档

项目目录：`C:\Users\juanc\AI Projects\english`。产品暂名 LingoCurrent，由 AI 按用户授权命名；不创建下一级项目目录。

Kickoff 已完成并于 2026-11-15（America/Toronto）获用户最终确认。已确定 34 条首版需求、补足规则和来源追溯。尚无应用代码、外部部署或实际语音测试结果；TTS demo 单独做 spike，D-014 及其他正常验证在 staging。

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
| [product/tts-spike-plan.md](product/tts-spike-plan.md) | 已确认的 TTS / 音色试听计划；尚未执行 |
| [product/refresh-behavior-proposal.md](product/refresh-behavior-proposal.md) | 已确认的解释缓存、收藏词卡和四选项刷新规则 |
| [product/content-source-research.md](product/content-source-research.md) | 文章来源初筛与尚待验证的条件 |

下一步为 /architect：设计满足 Clerk、Neon、Vercel、共享 OpenAI key 及目标规模的架构，随后在 Design 定义数据库、调度和用量记录结构。实际来源清单、音色选择和验证结果继续记录于 open-questions.md；研究候选不等于已通过选型。历史访谈中的旧理解以最终需求为准。
