# R3 · 文章采集、完整音频、阅读播放与缓存生命周期

GitHub：[#8](https://github.com/juanchaopan/lingocurrent/issues/8)。依赖 [#6](https://github.com/juanchaopan/lingocurrent/issues/6)、[#7](https://github.com/juanchaopan/lingocurrent/issues/7)。

## 类型与目标

`type:feature`；M1 完整首版。选定频道按独立计划产出可读可听文章，学习者能搜索、逐句和跨页跨文播放；采集、音频缓存与失败恢复在同一交付中完成。

## 对应需求

REQ-001、REQ-003–011、REQ-029–030、REQ-033–034、REQ-036、REQ-038；ADR-0003/0005/0007/0011/0013–0015/0017。以 design/data-model.md、api-contracts.md、state-machines.md、experience.md 与 validation.md 为准。

## 内部执行顺序

复用 R1 的表/鉴权/配置 → 扩展 content/reading/media/usage 迁移与契约 → 官方全文 feed/图标 → 频道调度/临时任务/分块 TTS → 完整发布与容量清理 → Articles/搜索/阅读/播放器 → staging 验收。每条路径前后端一起完成，UI 按已确认 mockup，保持单应用/单任务表。

## 验收标准

- [ ] Given 各频道独立时区/时点/篇数，When 到点或漏调补跑，Then 建任务与推进 next_run_at 同事务；考虑 DST/同刻多个计划，不重复抓取，也不把示例当全站固定 16 篇。
- [ ] Given 多篇采集中断或两个 worker 竞争，When 重领任务，Then 租约/fence/逐篇检查点恢复；正文、句子、TTS 任务原子写，采集交接成功删父任务和明细，TTS 成功发布同事务删任务，不留 done/永久运行历史。
- [ ] Given 正文、全文音频和时间轴，When 完整校验通过，Then 才能在列表/FTS 搜到；缺句/缺时间轴/上传后崩溃均不发布，重试不重复生成已完成分块。来源不足少发，不重复补数。
- [ ] Given Articles，When 搜索正文、Source/Category AND 组合筛选或排序，Then 对全量 ready 文章生效，访问时间每人每文唯一；句子逐行与段落/长句保留，未访问桌面留空、触控省略。
- [ ] Given 鼠标或触控布局，When 翻页/连续加载、进入及返回阅读，Then 使用互斥分页机制，查询/位置/焦点恢复，英文 UI/中文学习内容及键盘可用；列表没有播放器，阅读页有控制条。
- [ ] Given 单句/连续/Play all/行播放，When 播放、seek、调速或跨文章，Then 同一音频所有者按时间轴同步，冻结完整匹配集和 ordinal，跨页先推进列表再入下一篇；新文章下次加入，失效文章跳过，末项停止。
- [ ] Given 新音频和并发预留，When 达到或将越过 95%，Then 按首次创建 FIFO 清至实际低于 90%，非 LRU；淘汰文章当前音频同事务删除文/句/访问/队列/任务及引用，对象提交后幂等删，失败 retiring 可恢复；个人文字/进度不在清理范围。
- [ ] Given 私有 Neon 音频，When 授权/Range/签名过期/分支删除或容量释放异常，Then 实际服务验证访问隔离、续签与有界恢复；旧 worker/visit 不重建被删文章，不凭 S3Mock 证明权限。
- [ ] Given 每次生产模型调用，When 记账，Then 调用前 usage pending，重试/回退各一 attempt，未知回执不填 0；DB 故障不伪称已保存，关联删除不删用量；无费用看板、无 30 美元停用规则。
- [ ] Given worker 就绪，When 接通调度，Then 从 GitHub 注入开关/鉴权等实际所需配置并验证唤醒；复核免费平台可用的 15 分钟方案，不启第二队列/独立服务器。生产启用、测试仅短窗口，失败保留可恢复任务。
- [ ] Given 支持后台媒体的设备，When 锁屏/跨路由/切回前台，Then 验证连续播放/跨文/句子同步并记录限制，最终矩阵归 R5 汇总。

## 组件

content/reading/media/usage、application、基础设施 feed/TTS/S3/Drizzle/OTel、API/共享契约、Articles/阅读 feature、client player、迁移/worker/部署配置、Storybook/E2E 与运维证据。媒体端口给 R4 的词头/例句复用。

## 依赖、大小与风险

R1、R2 完成，正式来源和 TTS 由用户选择。XL，高风险（SQL、worker/存储基础设施、部署脚本、鉴权和删除一致性）；当前 head 人工确认后方可合并。

## 测试要点

CLAUDE.md 全套检查；真实 Postgres 双实例/旧 fence/容量预留/崩溃恢复；真实 Neon Range/权限/对象删除与计量；播放完整匹配集跨页与时钟；Linux 视觉及正常/空/加载/失败/长文与可访问性；staging 实际来源/音频，真机按 validation.md。每项证据记录准确版本/设备/限制。
