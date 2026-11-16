# ADR-0006 Drizzle 数据访问与 Zod 校验

- 状态：已接受
- 日期：2026-11-15
- 相关需求：REQ-003、REQ-013–REQ-021、REQ-026–REQ-031、REQ-034

## 背景

Next.js/TypeScript 已确定；数据库需要事务、任务领取、幂等和明确索引，AI 输出与外部输入不能仅依赖静态类型。用户逐项选择 Drizzle 和 Zod。

## 候选方案

| 决策 | 候选与优点 | 代价/适用条件 |
|---|---|---|
| 数据访问 | Drizzle：接近 SQL、类型安全，适合细化事务与领取查询 | 维护者需理解 SQL，代码需遵守 repository 边界 |
| 数据访问 | Prisma ORM：模型和客户端方便常规开发 | 任务行锁等仍可能需要原生 SQL；它与 Prisma Postgres 服务是两个选择 |
| 数据访问 | 直接 SQL：控制直接 | 映射、类型和约束的维护工作更多 |
| 运行时校验 | Zod：类型推导与输入/AI 输出校验统一 | schema 与模型返回格式要保持一致 |
| 运行时校验 | TypeBox + JSON Schema：适合标准 schema/API 优先 | 需额外选择和配置校验器 |

## 决策

使用 Drizzle 访问 PostgreSQL，Zod 校验请求、配置、任务载荷及 AI 结构化输出。用户已明确选择，不视为对尚未询问的包管理器、迁移流程或全部栈细节一并授权。

数据库访问集中 repository；service 持有业务事务边界，领域规则不依赖 Drizzle 或 Web 框架。Driver 必须支持所需事务语义，不能选择一个仅支持简单 HTTP 查询的路径后假设交互事务可用。迁移工具/流程后续单独选择。

## 证据

用户本轮选择；[Drizzle Neon 接入](https://orm.drizzle.team/docs/connect-neon)区分 HTTP 与交互事务路线。规范库 Node/TypeScript 已包含 Drizzle 与 Zod 推荐项，可复用分层和检查思路。没有应用代码或集成测试结果。

## 后果

- 好处：SQL 能力与输入边界明确，适用于临时任务和 AI 数据保护。
- 代价：关键 SQL、事务与并发需要针对性验证；schema 校验不替代个人数据授权、词义正确性和音频效果验证。
- 重新考虑条件：所选 driver/数据库能力不支持要求，或有实际维护证据证明需要更换；不因对象存储变化随意替换 ORM。
