# R1 · 一次打通环境、GitHub 配置、登录骨架和频道配置

GitHub：[#6](https://github.com/juanchaopan/lingocurrent/issues/6)。A 无依赖；B 复用 [#7](https://github.com/juanchaopan/lingocurrent/issues/7) 的来源验证/选择结果。

## 类型与目标

`type:chore`；M0 可部署骨架与选型。维护者按一份逐步指引完成所有环境/管道/配置，受邀用户能在真实 staging 登录、打开测试文章并保存个人访问。频道输入也在本 issue 完成，不另开环境或 staging chore。

## 对应需求

REQ-002、REQ-029、REQ-038；REQ-001/006/028/030 的最薄验证路径。参照 ADR-0006–0015、design/data-model.md、api-contracts.md，operations/deployment.md 与 setup-walkthrough.md。

## 执行顺序

1. **A：集中搭建。** 完成 GitHub 审查凭据、Variables/Secrets、Clerk Google/邀请、两个 Vercel 与两个 Neon 项目、私有对象存储、preview 非个人种子及资源清理。补齐可信部署注入中的缺口。
2. **A：走通真实骨架。** 按最终 schema 只落所需 members/来源频道计划/文章句子/访问与媒体元数据的最小迁移；自有文本和预制测试音频/时间轴走真实 DB/私有对象，验证登录→打开→保存→重载。通用内容 worker 与正式 TTS 留 R3。初始频道禁用，不假称已有真实来源。
3. **A 交接。** 当前 head 经审查后，staging URL、可信 spike 运行入口/凭据和预览生命周期可用，解锁 R2；不关闭本 issue。R1-A PR 正文使用“Refs #…”而非 Closes。
4. **B：频道输入。** R2 从[已保存的频道候选](../product/channel-candidates.md)补齐实测，提供用户选定的实际 manifest 后，使用本 issue 提供的受控配置入口，预览差异并幂等写入 Source/Channel/图标/时区/每时点篇数；复用该 manifest，不重新调查来源。不建运营后台，不做网页 scraping；采集保持关闭到 R3。B 验收后才关闭 issue。

## 验收标准

- [ ] Given GitHub 仓库配置，When 可信 CI 部署，Then 静态配置来自 Variables/Secrets，唯一仓库 OPENAI_API_KEY 供各环境复用；测试/生产 Clerk、DB、对象凭据隔离，浏览器、日志、制品无秘密。
- [ ] Given 已邀请/未邀请/撤销邀请的 Google 账号，When 登录或访问个人 API，Then 仅有效成员可进入，两个用户不能交叉读写访问记录；退出清 Query/Store/播放器/录音/浮层。
- [ ] Given 自有 fixture 正文与完整测试音频/时间轴，When 在 staging 打开后刷新，Then 唯一访问行保持且最后时间更新，验证真实数据库写入；不能用 health 200 代替。
- [ ] Given main push 的成功 CI，When 自动部署 staging，Then 部署准确 SHA；生产仅接受已通过 main CI 的版本标签并手动 dispatch，Vercel Git 自动部署关闭。预览部署需批准准确 head，换 head 失效。
- [ ] Given preview 非个人种子，When 创建可信 PR 预览并关闭 PR，Then 动态 Neon 分支/分支存储隔离且 Vercel/Neon 资源被清理，有链接和日志证据；生产从不作为 parent。
- [ ] Given 用户选择的频道配置，When 校验并导入，Then 非法 URL/时区/重复键/篇数拒绝且无半次更新，重复执行不重复建行；Source/Category/feed_url/图标与独立 schedule 入 DB。发布的操作说明给出实际已实现命令和配置示例。
- [ ] Given 完成 A，When R2 尚未完成，Then issue 保持打开但 R2 可以执行；Given B 验收，Then 配置清单、staging/preview 与手动生产入口证据齐全，再关闭 issue。

## 组件

`.github/workflows/`、`scripts/`、`infra/`、`drizzle/`、identity/content/reading/media 的最薄服务与仓储、基础页面/契约、`docs/operations/`。沿用现有模块和最终表结构，只增当前路径所需表；后续 issue 扩展，不提前建立全部产品表。

## 依赖、大小与风险

A 无；B 等 R2 的来源选择。A、B 共享本 issue，允许两个 reviewed PR；R2 依赖 A 的明确交接证据而非本 issue 的关闭状态。XL，高风险（身份、SQL、部署脚本、工作流和秘密注入均命中风险规则）。

## 测试要点

CLAUDE.md 全部 pnpm 检查；真实 staging/preview 冒烟及关闭清理；未授权/跨用户/撤销成员；幂等导入与失败回滚；环境绑定和秘密泄漏检查。已有 Compose/CI 基线复用，只补业务路径与实际云证据。

## 如何陪同用户

按 operations/setup-walkthrough.md，一次推进一个当前步骤：页面链接→字段名/所属 scope→预期结果。值只在 GitHub 输入，聊天只收完成/错误。A 完成给 staging URL 并交接 R2，B 时给已选频道清单再录入。不要求用户一次独自完成所有平台配置。
