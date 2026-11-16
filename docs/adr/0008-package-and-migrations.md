# ADR-0008 pnpm 与 Drizzle SQL 迁移

- 状态：已接受
- 日期：2026-11-15
- 相关需求：REQ-028–REQ-031

## 背景

单个 Next.js 应用位于当前 english 项目根目录，不另套项目名称目录。需要统一开发/CI/Vercel 依赖和可审查、可回滚兼容的数据库结构演进。用户明确选择 pnpm 和 Drizzle schema + SQL 迁移文件。

## 候选方案

| 决策 | 候选 | 取舍 |
|---|---|---|
| 包管理 | npm | 随 Node 提供，当前单应用配置简单；用户未选 |
| 包管理 | pnpm | 用户已选；固定工具版本并维护统一 lockfile/CI 配置 |
| 迁移 | Drizzle schema 生成 SQL | 用户已选；代码声明和可审查迁移文件同时版本化 |
| 迁移 | 手写版本化 SQL | SQL 控制直接，但需维护与 Drizzle schema 的同步 |

## 决策

使用 pnpm，固定 packageManager 工具版本，提交 pnpm-lock.yaml，开发、CI、Vercel 与格式化钩子统一使用 pnpm。实际版本在 scaffold 时按兼容性核对，不沿用规范库中的 npm 命令而遗漏替换。

以 Drizzle schema 为结构声明，生成 SQL 后检查、提交迁移文件，再按环境顺序执行。数据回填/索引等操作可补写经过审查的 SQL；不在生产每个请求或每个函数启动时自动 push schema。迁移由单一受控部署步骤执行，结构遵循扩展、迁移、收缩，应用回滚不要求立刻破坏性回滚数据库。

## 证据

用户本轮选择；[Drizzle 官方迁移](https://orm.drizzle.team/docs/migrations)提供 generate/migrate 流程。无实际 schema、迁移脚本或部署结果。

## 后果

- 好处：锁定依赖安装方式，数据库变更有可审查记录。
- 代价：需统一工具版本、序列化迁移并测试与旧应用兼容。
- 重新考虑条件：实际部署平台或运行库兼容性阻碍该流程；不因 CI 默认示例用 npm 就混用包管理器。
