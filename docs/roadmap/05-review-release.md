# R5 · 三模式复习、staging 验收和首版发布

GitHub：[#10](https://github.com/juanchaopan/lingocurrent/issues/10)。依赖 [#9](https://github.com/juanchaopan/lingocurrent/issues/9)，采用 [#7](https://github.com/juanchaopan/lingocurrent/issues/7) 的 Speak 决策。

## 类型与目标

`type:feature`；M1 完整首版。Speak/Spell/Translate 与独立间隔、错后回退、归档完成；在正常 staging 验收全站并手动发布首版。验收、故障修复和上线准备放在本 issue，不另开性能 spike 或 release chore。

## 对应需求

REQ-001、REQ-016、REQ-019、REQ-021–034、REQ-036–037、REQ-039；ADR-0012–0016/0019；design/stateless-review.md、state-machines.md、api-contracts.md、experience.md、validation.md。

## 内部执行顺序

复用 R4 的 progress/词卡 → 单一 REVIEW_STAGES 与实时下一题/幂等提交 → Spell/Translate → R2 选定 Speak 与有界录音 → 三模式 UI/例句/未知结果恢复 → 集成、真机、性能/费用、恢复和回滚演练 → 维护者审核后手动标签发布。

## 验收标准

- [ ] Given Vocabulary 三按钮，When 启动某模式，Then 先取该模式到期词、再按加入顺序取新词，每题实时查询可纳入新收藏/刚到期词；只存 review_progress，不建 session/cohort/prompt/attempt 或 phase/is_retry/业务版本。
- [ ] Given 有效正确提交，When 更新当前 mode，Then round+1，按统一常量的 1/2/4/7/15/30 天排下一次，终点 due_at=NULL；三模式全部完成才 Archived，其他模式不变。
- [ ] Given 有效错误，When 更新，Then round=max(0,round−1)、DB 提交时刻+10 分钟；连续错逐轮回退且不负数，0 轮已有 due 不算 New。技术失败/未提交/未知未核对不计错。
- [ ] Given 同 operationId 重试或两个不同 ID 并发作答，When 提交事务，Then 通用限期 receipt 与行锁重查使进度最多推进一次；响应丢失先核对，窗口过期不自动重放，已删除卡/旧 AI 结果不 upsert 复活。
- [ ] Given Speak/Spell 所有例句，When 展示或切换，Then 目标及变形在 DTO/DOM/aria/title 和音频 locator 均不泄漏，选区不能跨缺口，其他可见词仍能查；切换不提交、不丢输入，录音中暂禁切换。
- [ ] Given Speak，When 录音/上传/判定，Then 采用 R2 有证据的引擎/格式/边界/候选 K，正确/错误/近音/低频/短语及无效样本复验；权限/无效音频/依赖失败可重录且不计错，原始录音不长期保存。
- [ ] Given Spell 或 Translate，When 提交，Then Spell 按规范形式/acceptedForms 精确容错，不宽泛接纳错词；Translate 按本卡词义的 optionId 判定，不提前发正确项或信任客户端答案。
- [ ] Given 提交成功或关闭单题，When 返回 Vocabulary，Then 已保存结果只读，恢复原查询/筛选/位置/焦点；未提交不记错，pending/unknown 保留 operationId 核对，页面关闭不撤销服务器结果。正常视口单题一屏且放大/软键盘仍可操作。
- [ ] Given 全站 staging，When 按 validation.md 验证 39 条需求，Then 有完整路径、真实 Postgres 并发/崩溃、Linux 视觉、真机录音/选区/后台锁屏/跨文/签名续期证据；不可获得设备明确标未验证并由维护者决定，不冒充已测。
- [ ] Given 1,000 账号/100 人并发目标，When 按明确阅读/查词/Speak 流量配比压测，Then 报告样本数/分布/瓶颈及 P95 列表正文 3 秒、AI 查词判音 10 秒目标差距；估算参考月费用/免费 CPU、传输、存储、DB/Tracing，用未知标未知，不设 30 美元停用规则。
- [ ] Given 故障演练，When DB/AI/对象/任务超时、快照恢复或应用回滚，Then 个人学习文本/进度、待办/fence、资产引用和用量未知状态一致；承认 Neon Free 弱恢复，应用回滚不自动恢复已删数据。
- [ ] Given 验收缺口已解决或维护者明确接受已允许的支持限制，When 首版发布，Then 对通过 main CI 的版本打标签、更新版本/CHANGELOG/发布说明，维护者手动触发 production，生产冒烟与回滚路径有证据。若平台能力不足或核心需求未过，保持未完成，不静默升级/砍范围。

## 组件

review/application/SpeechMatcher 与进度仓储、共享 DTO、Review/Vocabulary/client 缓存、迁移/运维、全链路测试与发布记录。沿用 R1 的手动发布管道、R3 的 media/usage、R4 的 lookup/词卡，不创建第二套系统。

## 依赖、大小与风险

R4 完成，R2 的 Speak 选择和真实 Hobby 证据可用。XL，高风险（SQL、语音基础设施、持久进度/个人数据与发布）；PR 当前 head 人工确认；生产仍保留手动发布入口。

## 测试要点

CLAUDE.md 全部检查；表驱动覆盖六段/终点/连续错误/三模式独立；真实 DB 同 ID/不同 ID 并发、删卡竞争、未知提交恢复与窗口过期；服务端隐藏目标保护；真实录音负样本、全站实际 staging 负载/设备/恢复/标签部署。验收发现的问题在本 issue 修复，记录真实结果。
