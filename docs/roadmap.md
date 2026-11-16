# 路线图

日期：2026-11-16（America/Toronto）。用户已确认五项合并计划，GitHub 已建立 [M0](https://github.com/juanchaopan/lingocurrent/milestone/1)、[M1](https://github.com/juanchaopan/lingocurrent/milestone/2) 和 #6–#10。R1–R5 是便于说明阶段的计划标识，实际开发使用对应 GitHub 编号；进度以 issue/里程碑为准。

本次按用户“数量越少越好”的要求合并：**1 个 chore、1 个 spike、3 个 feature，共 5 个 issue**。环境搭建、部署管道、staging、频道配置入口、预览和生产发布准备都归 R1；TTS、Speak、全文 RSS 共用 R2，分别出结论。完整首版没有缩减，也没有另列 M2。

这是任务组织调整，覆盖历史文档要求“分别创建三个 spike issue”的安排；各自的样本、证据和用户选型门槛仍保留。引擎和正式来源尚未确定。

## 里程碑与 issue

| 编号 / 类型                                                                 | 标题与完整规格                                                              | 里程碑              | 大小 / 风险 | 依赖                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------- | ----------- | ------------------------------------ |
| [R1 / #6](https://github.com/juanchaopan/lingocurrent/issues/6) · chore     | [一次打通环境、GitHub 配置、登录骨架和频道配置](roadmap/01-environments.md) | M0 可部署骨架与选型 | XL / 高     | A 阶段无依赖；B 阶段等 #7 的来源选择 |
| [R2 / #7](https://github.com/juanchaopan/lingocurrent/issues/7) · spike     | [合并验证 TTS、Speak 与全文 RSS](roadmap/02-spikes.md)                      | M0 可部署骨架与选型 | L / 高      | #6 的 A 阶段，不等待 #6 关闭         |
| [R3 / #8](https://github.com/juanchaopan/lingocurrent/issues/8) · feature   | [文章采集、完整音频、阅读播放与缓存生命周期](roadmap/03-reading.md)         | M1 完整首版         | XL / 高     | #6、#7 完成                          |
| [R4 / #9](https://github.com/juanchaopan/lingocurrent/issues/9) · feature   | [语境查词、收藏和完整词库](roadmap/04-learning.md)                          | M1 完整首版         | XL / 高     | #8                                   |
| [R5 / #10](https://github.com/juanchaopan/lingocurrent/issues/10) · feature | [三模式复习、staging 验收和首版发布](roadmap/05-review-release.md)          | M1 完整首版         | XL / 高     | #9；采用 #7 的 Speak 决策            |

M0 的完成标志：受邀登录 → 打开测试文章 → 写入个人访问记录 → 重载可读；实际 staging 部署与可信 PR 预览/清理均验证；语音与来源形成有证据的决定，已选频道写入测试数据库。M1 的完成标志：39 条需求全覆盖，真实语音/设备/事务及恢复证据齐备，手动标签发布完成。

L/XL 如实表示合并后超过通常 M 的工作量，不承诺 500 行以内或固定工期。默认一个 issue 一个功能 PR；R1 为解除来源验证与配置的先后依赖，允许 **A、B 两个 PR 共用同一 issue**，只在 B 完成后关闭。其他项若必须分批审查，继续关联原 issue，不另建追踪子 issue。每个 PR 都保留自检和审查，中高风险仍须维护者确认当前 head。

## 实际执行顺序

1. **R1-A：先有可用 staging。** 集中完成账号、GitHub Variables/Secrets、云资源、可信部署/预览、最薄登录与数据库路径。只用自有测试文章/音频和禁用采集的 fixture 频道；正式来源尚未选定。R1 此时保持打开。
2. **R2 → R1-B：集中选型并录入频道。** 同一 spike 内完成三组验证；用户试听选声音、确认来源与频道计划后，在 R1 的同一配置入口导入真实 Source/Channel/时区/时点/篇数。采集仍关闭，待 R3 worker 就绪。两个里程碑内的部分阶段依赖不会形成“互等 issue 关闭”的环。
3. **R3 → R4 → R5：三个开发项按顺序交付。** 每项通过后在 staging 直接验收和修复；最后汇总真机、性能与恢复证据并手动发布。不另建性能 spike 或上线 chore。

每次陪同用户操作，只说明当前一步：打开哪个页面、填写哪些字段、完成后如何确认；只需回复完成状态/错误信息，不索取密钥。入口是[逐步搭建说明](operations/setup-walkthrough.md)。

来源交接直接复用[已知频道/精确feed/证据与缺口](product/channel-candidates.md)，同一清单也已附在 #7 正文中。R2 补全文/来源条件实测，R1-B 与 R3 复用通过结果和 manifest；除候选失效或不能满足需求外，不重新调查来源。Fashion/Style 的精确全文 feed 仍是明确缺口，不能当成已确定频道。

## 配置归属

- 所有部署静态值统一由 GitHub Actions **Variables / Secrets** 管理；`OPENAI_API_KEY` 仅仓库级一份，各环境共用。其他凭据按 `staging`、`production`、`preview` 隔离。可信 CI 注入构建/运行环境；Vercel 承载注入后的值，不另设一套手工维护的配置真源。
- 来源/频道/图标/采集计划按 REQ-038 保存在数据库；R1 提供校验、预览变更和幂等导入入口，R2 产出获用户选择的实际输入。它们属于业务配置，不用 Secrets 代替数据库表。若导入需要静态开关或凭据，仍从 GitHub 注入。
- 动态 PR 数据库连接与分支存储凭据由可信 workflow 临时创建、掩码及清理，不手工复制为长期 Secret。预览种子无个人数据，所有带秘密的预览须批准准确 head SHA。
- 调度启用、worker 鉴权、并发/采样等实现时新增的部署配置，必须同步登记 GitHub 配置清单；现在的部署脚本只会传递明确列出的 key，需要随功能 PR 接线并验证，不能只在 GitHub 添加名字就视为生效。

## 需求覆盖与验收主人

| 需求            | 主责 issue | 范围                                                               |
| --------------- | ---------- | ------------------------------------------------------------------ |
| REQ-001         | R3、R4、R5 | 全英文响应式体验、可访问性，按各功能验收                           |
| REQ-002         | R1         | Clerk 邀请制 Google 登录、个人隔离、退出清理；后续每个接口继续验证 |
| REQ-003–REQ-005 | R3         | 独立调度、正文、完整音频/时间轴就绪后发布                          |
| REQ-006–REQ-011 | R3         | 文章/访问/搜索、逐句播放、冻结队列及跨页跨文                       |
| REQ-012–REQ-021 | R4         | 连续选区、解释缓存/词义、嵌套浮窗、收藏/题组、词卡与删除           |
| REQ-022–REQ-028 | R5         | 三模式、间隔/错后回退、仅进度持久化与去重                          |
| REQ-029         | R1         | 指定平台与 GitHub 配置，R2 提供语音适用证据                        |
| REQ-030         | R3、R4、R5 | 每条功能链的失败重试、保留旧值和恢复                               |
| REQ-031         | R5         | 实际负载配比、目标容量/延迟/费用及免费边界                         |
| REQ-032         | R2、R5     | R2 集中候选验证，R5 完整 staging 集成验收                          |
| REQ-033         | R3、R5     | 后台/锁屏实现及最终真机支持范围                                    |
| REQ-034         | R3         | 首次生产模型调用起完整记账；R4/R5 复用并验证                       |
| REQ-035         | R4         | 词头/短语、例句按需音频；复用 R3 的媒体与任务机制                  |
| REQ-036         | R3、R4、R5 | 鼠标/触控布局、分页/连续加载、浮窗与单题                           |
| REQ-037         | R4、R5     | 词库全量查询/组合筛选；R5 验证真实到期/归档状态                    |
| REQ-038         | R1、R2、R3 | R1 配置导入，R2 来源证据/选择，R3 调度采集和筛选                   |
| REQ-039         | R4、R5     | 列表单删/批删、确认与焦点；R5 复习竞争回归                         |

## 统一交付门槛

所有功能沿用已确认的 [Design](design/README.md)、[当前数据模型](design/data-model.md)、[API](design/api-contracts.md)、[状态机](design/state-machines.md)与[验证矩阵](design/validation.md)，最新规则优先于历史描述。尤其不加复习 session/prompt/attempt/phase、业务版本、第二套队列或永久采集运行历史。

执行 CLAUDE.md 的 pnpm 自检，真实 Postgres 验证并发/事务，固定 Linux 镜像验证截图，真机验证原生选区/录音/后台播放。失败或设备不可获得写明证据与缺口；计划、mock 和文档通过不能代替实际验收。每个 feature 的错误/空/加载/长内容状态、Storybook、键盘与当前 mockup 对照都在该 issue 内完成。

GitHub 复用 `type:chore/type:spike/type:feature`，使用反映实际规模的 `size:L/size:XL`；五个 issue 已按依赖顺序创建，正文互引实际编号，#7 明确仅等 #6 的 A 阶段。本文及配套文档通过 `codex/lean-roadmap` PR 审查，不在文档内维护完成百分比。

下一步从 `/implement 6` 开始，到 A 阶段交接点执行 `/spike 7`，再回来完成 #6 的 B 阶段。该阶段显式指定编号，避免 `/implement next` 把未关闭的 #6 误当完全阻塞；其后可用 `/implement next`。
