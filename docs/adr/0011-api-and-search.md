# ADR-0011 HTTP/JSON API 与 PostgreSQL 英文全文搜索

- 状态：已接受
- 日期：2026-11-15
- 相关需求：REQ-006、REQ-007、REQ-012–REQ-030

## 背景

同一 Next.js 应用的客户端需要查词、收藏和复习操作；文章正文保存在 Postgres，无需额外搜索服务。

## 候选方案

| 决策 | 候选 | 取舍 |
|---|---|---|
| API | HTTP/JSON、REST 风格 | 用户已选，便于独立检查；契约需版本化 |
| API | tRPC | 类型联动方便，但引入 RPC 依赖，媒体仍需独立处理 |
| 搜索 | PostgreSQL 英文全文 + GIN | 用户已选，支持英文词形/多词检索 |
| 搜索 | 子串 + pg_trgm | 片段原样查找更直观，但词形不自然归并 |

## 决策

Route Handlers 提供 HTTP/JSON API，Zod 校验后调用应用命令/业务服务；服务端渲染直接调用同一服务，不 HTTP 请求自身。个别媒体端点可流式返回/签发播放链接，不强制把音频转为 JSON。

API 使用版本化路径/契约、统一错误码与关联 ID；写操作带幂等标识和必要资源版本。会话用户从 Clerk 服务端校验取得，不相信请求体的 owner_id；内部调度入口单独鉴权。

正文使用英文全文配置和 GIN 索引，仅搜索当前 published、未淘汰文章。Design 明确词查询、短语、停用词和排序行为；不声称支持任意子串、模糊拼写或 AI 语义搜索。全文索引随文章入库/淘汰维护。

## 证据

用户选择；[PostgreSQL 全文搜索](https://www.postgresql.org/docs/current/textsearch-intro.html)、[pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)。无查询计划或负载测试，P95 在 staging 验证。

## 后果

- 好处：API 边界可独立验证，无额外搜索基础设施。
- 代价：维护契约、索引及搜索语义；不是所有字符串片段都有匹配结果。
- 重新考虑条件：真实内容量与查询需求超出 Postgres 方案，另行设计再决定。
