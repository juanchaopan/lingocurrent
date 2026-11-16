# 数据库：Vercel 管理入口与免费额度

核对日期：2026-11-15（America/Toronto）。状态：用户已选择 Vercel-managed Neon，并另选 Neon Object Storage，见 ADR-0007。下文保留选型对比；未创建数据库、安装集成或申请付费套餐。

## Vercel 是否提供数据库

[Vercel Postgres 官方说明](https://vercel.com/docs/postgres)：旧 Vercel Postgres 已停止提供，既有数据库于 2024-12 迁到 Neon；新项目通过 Marketplace 接入 Postgres 供应商。因此可以从 Vercel 创建、绑定数据库并减少部署配置，但实际数据服务仍由所选供应商提供。

推荐 [Neon 的 Vercel-managed 集成](https://neon.com/docs/guides/vercel-managed-integration)：Vercel 中创建/管理、自动注入 DATABASE_URL 等连接配置，可选择预览分支；计费入口集中到 Vercel。供应商仍是 Neon，没有得到一套独立于 Neon 的“Vercel 免费 SQL 额度”。

## 三个候选

| 方案 | 免费额度的公开依据 | 优点 | 代价/注意事项 |
|---|---|---|---|
| Vercel-managed Neon，推荐 | [Marketplace](https://vercel.com/marketplace/neon)从 $0 起；[Neon 当前 Free](https://neon.com/pricing)为每项目 1 GB、100 CU 小时/月，最高 2 CU/8 GB | 保留已选 Neon，把创建、绑定和账单入口集中到 Vercel | 是供应商集成；实际创建页面需确认提供的免费计划与公开页面一致，不把两处免费额度相加 |
| 直接管理 Neon + Vercel 连接 | 同一 Neon Free 参考额度 | 已有 Neon 账号/项目时直接复用，供应商配置与用量清楚 | 多一个日常控制台；也可使用 previews 集成或手动连接 |
| Vercel Marketplace Prisma Postgres | [Marketplace](https://vercel.com/marketplace/prisma)和[供应商价格页](https://www.prisma.io/pricing)均列 Free：2 GB、200,000 次操作/月、50 个数据库，无需信用卡 | 空间更大，也支持 Vercel 自动连接配置 | 改变既定 Neon 供应商；查询操作上限要覆盖网站、个人学习和后台，不能只比较空间 |

Prisma Postgres 是数据库服务，Prisma ORM 是应用中的数据访问工具，两者不是同一选型；选择数据库不强制一并选择 Prisma ORM。[Prisma Postgres 文档](https://www.prisma.io/docs/postgres)说明可从 Postgres 客户端连接，提供连接池。

## 额度不能直接折算

- Neon 的 CU 小时是数据库计算规模乘活跃时间，不是 SQL 条数。100 CU 小时不能理解为 100 小时网页可用；scale-to-zero、最低运行规格、唤醒与实际负载影响消耗。
- Prisma 当前定义一条数据库查询为一个 operation。200,000/月除以已选参考 60,000 次查词和 Speak 操作/月，只有约 3.33 条 SQL/次，尚未计列表、收藏、其他复习、登录校验和后台；这是预算除法，非已测查询数。事务内的多条查询不能想当然只算一个 operation。
- 任务表成功即删，降低残留数据；领取、续期、保存分块、完成删除仍消耗查询/计算。空轮次立即返回，避免持续轮询数据库。
- 个人查词缓存和词卡保留且持续增长，删除旧文章不会清掉这部分数据库数据。因此 1 GB 或 2 GB 都不能宣称能永久容纳目标规模，需按实际字段、索引与增长测算。
- Neon Free 恢复窗口/变更量与单手动快照受限，Prisma 每日备份属于付费能力之一。用户现选择 Neon Free 并接受弱恢复，不保证早期 24 小时 RPO/RTO；具体边界及恢复引用对账见 ADR-0013，不向音频缓存写数据库备份。

## 本项目的推荐

保留 Neon，通过 Vercel-managed 集成满足简化部署入口的需求，避免为“同一个控制台”更换数据库。该方案采用 PostgreSQL 事务来保证文章与临时任务一起提交；Drizzle/Prisma ORM 继续单独询问。

不启用集成中可选的额外 Auth、Realtime、Functions 或 AI Gateway，身份仍为 Clerk、应用计算仍在 Vercel，避免引入本项目不需要的能力。

配置仍遵守 GitHub 管理静态 Secrets/Variables 的已定要求：创建后将根环境的数据库连接凭据纳入 GitHub Secret 管理，并通过部署流程与 Vercel 保持一致；预览分支的临时连接配置按动态资源绑定处理。集成自动注入不是把密钥提交进代码的理由。

当前已选 Vercel-managed Neon；四环境、Drizzle 版本化 SQL 迁移与 Free 较弱恢复分别见 ADR-0008/0012/0013。实际区域及配置在资源创建时核对，若 Marketplace 免费条款不同于本次公开核对，记录差异，不默认启用付费。
