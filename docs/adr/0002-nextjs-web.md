# ADR-0002 Next.js 与 TypeScript 全栈 Web

- 状态：已接受
- 日期：2026-11-15
- 相关需求：REQ-001、REQ-002、REQ-008–REQ-016、REQ-029、REQ-033

## 背景

产品是需要复杂播放器、选词与嵌套浮层的响应式网站，所有应用计算部署在 Vercel，一人维护。没有搜索引擎收录要求；选择全栈框架的依据是统一部署与服务端入口，而不是假设必须做 SEO。

## 候选方案

| 方案 | 优点 | 缺点 | 适合条件 |
|---|---|---|---|
| Next.js + TypeScript | 页面、服务端鉴权与 Route Handlers API 同一项目 | 需明确 Server/Client 边界，并调整现有 Vite 模板规范 | 当前 Vercel 约束及单人维护 |
| React/Vite + Node API | 贴合现有规范模板，SPA 边界直接 | 需另外集成 API 构建、路由与发布 | 偏好 SPA 或已有独立 API |

## 决策

采用 Next.js App Router、React、TypeScript；用户在架构访谈第二轮明确选择 Next.js + TypeScript。播放器与需要浏览器能力的交互使用 Client Components，服务端代码不得被浏览器模块导入。页面与 API 共享业务服务，不通过自身 HTTP 接口反复转调。

后续详细技术决策和目录规则另记 ADR；本 ADR 不提前锁定尚未选择的状态库、ORM、样式、包管理器、测试框架或版本号。

## 证据

[Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) 支持在 App Router 中定义 HTTP 处理入口；[服务端和客户端组件](https://nextjs.org/docs/app/getting-started/server-and-client-components)解释两侧的职责。官方能力尚不等于本项目交互或性能已经验证。

## 后果

- 好处：Web 与 API 集成配置集中，使用已有 React/Node 规范作为基础。
- 代价：scaffold 的 React 栈默认针对 Vite，必须调整构建、测试、Storybook 集成及 dependency-cruiser 路径；不能直接复制配置后假定适用。
- 重新考虑条件：框架约束实际阻碍已确认的后台播放或选词要求，且证据表明独立 SPA 能解决；先记录 staging 结果再评估。
