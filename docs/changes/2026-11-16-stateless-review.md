# 取消复习会话及phase，错误减轮最低0

历史阶段记录：下述保留prompts/attempts及POST next方案随后被用户撤回；最终复习只存review_progress，取题GET只读，通用operationId去重，见[最终确认](../design/finalization.md)。

- 日期：2026-11-16。
- 级别：L2 复习业务规则修订 / D2 复习数据及接口重新设计；目前只有设计稿，无应用重构。
- 来源：用户“round减一……下一次加回去，再错再减”，并确认“保持0”。

## 变了什么与原因

按用户偏好的直接排期精简：删除session两表及phase/is_retry，轮次改为可升降round；错误减1最低0并延10分钟，正确加1查间隔。每题实时查询到期与未开始词，不冻结批次。该规则替代短练成功独立保轮逻辑；连续错可能退多轮。

## 影响与决定

| 类别 | 内容 |
|---|---|
| 需求 | REQ-019、022、026–028、037；动态选题、轮次进度、最低0、状态派生 |
| 架构 | ADR-0019，review模块边界与技术栈不变 |
| 数据/API | progress仅round/due_at及关联字段；prompt无session_id；POST /review/next替代session接口 |
| 体验 | 无Practice标记和固定批次题数；关闭直接回Vocabulary |
| 示例 | stateless-review.md演绎每次INSERT/UPDATE/DELETE及正确/错误/重复提交 |
| 迁移 | 无现有应用/SQL/用户数据，直接修订目标设计，不建兼容层 |

保留单题prompts和attempts的重试/并发保护，未趁机修改Clerk、采集、个人文本、文章播放或列表快照。历史访谈和旧变更记录保留，顶部最新修订说明明确覆盖冲突项。

## 拆出的工作

本轮不创建Issue；后续Roadmap按ADR-0019拆动态选题、原子提交和真实DB并发验收。没有提前scaffold、数据库实现、RSS调查、finalize或commit。
