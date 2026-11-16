# ADR-0016 TTS 与 Speak 引擎等待分别验证

- 状态：提议（须经 spike 证据及用户选择后定引擎/音色）
- 日期：2026-11-15
- 相关需求：REQ-005、REQ-023、REQ-029、REQ-031–REQ-033

## 背景

用户已接受 TTS/Speak 分别 spike，Speak 不能在手机浏览器做本地模型测试，须核对 Vercel 免费硬件与月容量；本地不足则用 OpenAI。压缩可以降低音频体积，但要自然清晰。

## 候选与验证顺序

TTS 先用当前 OpenAI 音频方案作自然度对照，再验证 Kokoro-82M、Supertonic 3 的实际 Vercel 可行性；不是已证明前者最佳。OpenAI 模型/API 生命周期在实施时复核，不能将旧 Speech API 示例直接套到 Realtime。

Speak 研究 Vosk 小型可调词图候选与更小模型的质量/兼容性取舍，和 OpenAI 原始录音对照；PocketSphinx 仅备选。Top-K 命中是用户允许的产品路线，K、大小写/拼写规范化、短语和近音误通过率需负样本证据。不得只给识别器唯一目标再以命中率证明效果，路径分数也不当成校准概率。

## 决策提案

引擎都通过应用适配端口调用，所有本地推理也只在 Vercel，不增加独立服务器。spike 要输出真实 Hobby 的部署、包体、冷/热延迟、峰值内存、CPU 时间及参考月负载预算；2 GB/1 vCPU/300 秒与团队免费 CPU 用量分别核对。

TTS 实际样音供用户试听，比较低码率/单声道自然度、体积、时间轴与编码成本。Speak 包含正确、错误、近音、低频词/短语及无效录音；不得仅凭通用 WER 判定短词匹配可靠。具体计划及主要来源见 [候选研究](../architecture/speech-candidates.md)、[TTS 计划](../product/tts-spike-plan.md)、[Speak 计划](../product/speak-spike-plan.md)。完整集成/真实手机与 D-014 仍在 staging。

## 排期与后果

用户在架构定稿后明确执行顺序：先 Design，再 scaffold/准备并推送 GitHub 仓库，由 roadmap 分别创建 TTS/Speak 的 type:spike issue；探针排在依赖其结论的正式实现之前，不在 architecture 结束后立即执行。适配端口允许其他设计/骨架工作先推进。

在证据前保留候选，不作已通过或零成本承载承诺。spike 结果必须回写本 ADR，选定音色/引擎后再正式接入；整体架构获确认也不自动使本 ADR 变为已接受。
