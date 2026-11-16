# ADR-0014 Vercel 免费追踪、结构化日志与用量记录

- 状态：已接受（按用户“免费可用则采用”的条件核实）
- 日期：2026-11-15
- 相关需求：REQ-028、REQ-030、REQ-031、REQ-034

## 背景

用户要求若 Vercel 免费 tier 支持 OpenTelemetry，则采用；Vercel 支出必须为 0，费用相关记录入库但没有费用看板。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| @vercel/otel + 内置 Tracing 免费额度 | 符合用户条件，无额外收费接收端，关联 Next/API/DB/外部调用 | 有团队 span units 与短保留限制，需要采样 |
| 只有结构化日志 | 配置少 | 缺少请求各阶段时间关系 |
| 外部追踪接收端/付费增强 | 更长留存与分析选项 | 新服务/费用与维护，当前不选 |

## 决策

核实后采用 @vercel/otel 和 Vercel 内置查看路径，配合结构化 JSON 日志及数据库用量记录；不启用收费 Observability Plus 或 Trace Drains。

Hobby 公开额度为每月 1,000,000 span units/团队，trace 保留 3 天。至多 2 KiB 的 indexed span 计 1 unit，更大按单位累加；不是一百万请求。耗尽后团队追踪暂停，周期后仍需有权限者手动恢复，不自动升级。

显式配置采样，初始生产低比例、测试仅短期排查窗口；避免新 Next 项目的默认 100% 收集耗尽额度。追踪额度、CPU 和日志共同计入资源核对。错误日志/业务结果不依赖追踪采集成功；不在 span 放 API key、个人录音、完整 AI 上下文或高基数个人信息。

请求、任务及外部调用带关联 ID，记录阶段耗时、失败类别、任务积压/租约异常；模型调用先记录逻辑操作，实际请求按尝试记录用量，未知用量标未知，不能按零费用处理。免费 trace 短留存不替代持久业务/用量记录。

## 证据

2026-11-15 核对 [Tracing 配额与采样](https://vercel.com/docs/tracing/configure-tracing)、[OTel 接入](https://vercel.com/docs/tracing/instrumentation)、[GA 公告](https://vercel.com/changelog/vercel-tracing-is-now-generally-available)。没有应用接入或消耗测量。

## 后果

- 好处：免费能力内可查看请求链路，满足用户条件。
- 代价：短保留、采样与团队额度会影响可见性，不保证每次请求都有 trace。
- 重新考虑条件：实际诊断需求超出免费能力或条款变化；重新选择，不能暗中添加收费服务。
