# R2 · 合并验证 TTS、Speak 与全文 RSS

GitHub：[#7](https://github.com/juanchaopan/lingocurrent/issues/7)。依赖 [#6](https://github.com/juanchaopan/lingocurrent/issues/6) 的 A 阶段交接，不等该 issue 关闭。

## 类型与目标

`type:spike`；M0 可部署骨架与选型。一个 issue、三个证据部分，回答声音怎么选、Speak 在真实 Hobby 是否可用、哪些频道直接含全文并适合接入。候选结论分别记录，不因合并而取消验证或提前选定引擎。

## 对应需求

REQ-003–005、REQ-023、REQ-029、REQ-031–033、REQ-038；ADR-0016 与 product/tts-spike-plan.md、speak-spike-plan.md、rss-spike-plan.md、voice-validation-plan.md。

## 执行顺序与时间盒

复用 R1-A 的可信环境与共享 key，不另搭计算服务器。执行前核对当时官方模型/API/套餐和账号可用能力。建议起始时间盒 TTS 2 小时/最多两轮试听，Speak 2 小时，RSS 1 小时；后两项为排期初值，执行前按 spike 约定明确资源/样本判据，到时无结论记录未决与后备，不无限扩大候选。不在本次 roadmap 执行探针或收费调用。

1. TTS：同文比较最多三种方案，优先至少两引擎；给出 3–4 段可播放 demo、压缩/单声道听感、句子边界、编码代价、实际大小/耗时/用量，由用户选引擎/音色。服务端候选需真实 Vercel 可部署证据，不能以开发机成功替代。
2. Speak：Vercel 服务端本地候选优先，不适用走 OpenAI 原始录音对照。本人 10 正确+10 错误+至少 3 无效，包含近音、低频词、短语和换错误目标负对照。人工标签是真值，不以唯一目标解码制造高命中；报告各 K 误接受/误拒绝，分数不当发音百分比。
3. RSS：从[已记录的频道候选及精确feed](../product/channel-candidates.md)继续，不重做来源初筛。优先验证 NASA Technology/Aeronautics/News Releases、Hackaday Blog、NIH Research Matters；Fashion/Style 尚无已核实feed，是明确的补查缺口。至少三篇与网页正文比对（不足标注），记录全文/截断、图标、去重键与使用条件；用户选择来源和实际频道计划后，交 R1-B 同一份 manifest 录入。只有候选失效或不满足要求才重新发现来源。

## 验收标准

- [ ] Given TTS demo，When 用户试听，Then 有真实可播放文件、相同原文及参数/费用、自然清楚的压缩对照，保留全文/单句映射；用户明确选定或记录尚未选定，不靠官方 demo 冒充本项目实测。
- [ ] Given Speak 样本，When 在实际 Vercel Hobby 执行，Then 报告部署/解压包体/原生依赖、冷/热延迟及样本数、内存峰值/CPU 和参考月调用容量；明确部署不可行、效果不合格、免费容量不足或可采用，不只给单次成功。
- [ ] Given 初始 Speak 质量基线，When 对照人工标签，Then 正确至少 9/10 接受、错误至少 9/10 拒绝、无效均不通过且可重录；判据未经证明不得宣称普适。确认 K、允许形式、录音格式/大小/时长、超时与 fallback 策略，或列明缺口。
- [ ] Given RSS 候选，When 检查 feed，Then 真实 URL、检查时间、正文样本/限制和来源条件有证据；“可订阅”不等于可存全文/生成 TTS。没有合适来源如实列缺口，不默认 Yahoo，不偷偷换 scraping。
- [ ] Given 已保存的候选清单，When 交接 R1-B/R3，Then 复用精确 feed、证据和最终 manifest，不再次从零调查；未知Fashion feed与未经选择的时区/时点/篇数不伪装成已定配置。
- [ ] Given 选型结束，When 写结论，Then 更新 ADR-0016 的各项决策/未决及来源报告，保留样音和最小结果，原始 Speak 录音按约定清理。试验代码不直接成为正式实现。
- [ ] Given 免费额度或质量不合格，When 总结，Then 不自动升级、不新增计算服务器、不因 30 美元期望限制用户；存在阻塞则 issue 不标已完成，后续功能不采用未证实的候选。

## 组件

隔离 probe/可信 staging 测试入口、模型与来源端口验证、`docs/adr/0016…`、`docs/product/` 的结果与频道输入清单；不实现完整业务界面、生产 worker 或独立 D-014 性能探针。

## 依赖、大小与风险

依赖 R1-A 有证据的环境交接，不等 R1 关闭；输出解锁 R1-B 及 R3/R5。L，计划风险高（可信云测试/部署脚本及秘密）；最终仅结果文档的 PR 按实际 diff 可为低风险。测试 harness 领取秘密前仍需审查当前 head。

## 测试要点

使用各原计划的质量/负样本/资源判据，记录可重复运行方式与实际结果。30,000 次 Speak/月仅参考量，另给网站/TTS 留余量；不同资源/成本口径不混算。手机录音/锁屏、完整复习和 D-014 全站负载留正常 staging，归 R5。
