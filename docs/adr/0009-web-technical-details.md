# ADR-0009 Web 组件技术细节

- 状态：已接受
- 日期：2026-11-15
- 相关需求：REQ-001、REQ-006–REQ-028、REQ-033

## 背景

Next.js/TypeScript 已接受，用户需要连续播放器、选词、嵌套浮层、词卡及多模式复习。前端个人状态必须隔离，进度不能被浏览器缓存替代。用户逐项选择以下方案。

## 候选方案

| 决策 | 已选 | 比较与理由 |
|---|---|---|
| 服务器数据状态 | TanStack Query | 较 SWR 更适合本项目分页、提交与失效刷新；需要统一 query key |
| 跨路由客户端状态 | Zustand | 相比 Context/useReducer，集中管理播放器/浮层状态与订阅较直接；新增依赖 |
| 样式 | Tailwind + 设计令牌 | 用户选择；较 CSS Modules 更方便组合样式，仍需约束语义令牌 |
| 分层 | 页面容器 + 展示组件 | 容器取数/编排，展示组件只接收 props 与回调，支持独立验证 |
| 基础组件 | 原生语义组件 + 自有样式 | 用户选择，依赖少、定制自由；键盘、焦点与浮层行为由项目维护 |
| 设计来源 | AI 先出令牌与关键界面稿 | 用户先确认可见效果，再接完整页面 |
| E2E/视觉 | Playwright 流程 + 截图回归 | 用户选择；统一截图运行环境，真实手机媒体/手势另测 |

## 决策

上述已明确选项生效。后续用户已接受 Storybook、Vitest + React Testing Library，见 [ADR-0010](0010-visual-and-testing.md)。

Next App Router 管路由，不叠加 React Router。播放器宿主位于跨路由保留的客户端应用外壳，一次只有一个音频所有者；打开解释不打断文章，播放例句才暂停文章并保存位置，之后手动恢复。

TanStack Query 仅管理取数状态；持久解释缓存、词卡和复习仍由服务器保存。query key 包含用户身份及资源版本，退出/换用户时清空个人客户端缓存。不会因自动重新取数而偷偷刷新 AI 解释或生成选项；AI 刷新与收藏是显式操作，重复请求复用操作标识。

Zustand 保存队列、播放位置、选句和浮层等客户端状态，不在服务器模块全局保存跨用户数据。SSR 相关 store 按请求/客户端 provider 隔离，不将某个用户的快照序列化给另一用户。成绩保存成功前不显示已推进进度。

展示组件不得直接导入数据访问、路由状态或全局业务 store；页面/容器通过参数和事件编排。Tailwind 使用统一语义颜色/字号/间距令牌，状态文案配合颜色。目标隐藏不只依赖 CSS：作答前的可见选区及音频授权要按规则处理。

## 证据

用户各项选择；官方能力见 [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)、[Zustand](https://zustand.docs.pmnd.rs/learn/getting-started/introduction.html)、[Next CSS](https://nextjs.org/docs/app/getting-started/css)、[Playwright 视觉比较](https://playwright.dev/docs/test-snapshots)。没有界面实现、设计稿验收或设备测试结果。

## 后果

- 好处：服务器数据、交互状态与展示边界清楚，跨页播放可持续维护。
- 代价：需实现自有无障碍组件、依赖检查及缓存失效规则；不能直接复制 Vite 规范配置。
- 重新考虑条件：实际渲染或状态联动出现证据性问题，或用户修改视觉/组件策略。
