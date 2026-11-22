# ADR-0016 TTS 与 Speak 引擎等待分别验证

2026-11-16 Roadmap组织更新：用户要求尽量合并spike，TTS/Speak与全文RSS共用[GitHub #7](https://github.com/juanchaopan/lingocurrent/issues/7)（[R2规格](../roadmap/02-spikes.md)），各自验证与选择仍分别完成。本文旧文中的“分别创建issue”安排被覆盖；引擎/音色状态仍为提议，未取得实测结论。

- 状态：部分确认（TTS 听感与压缩已选；当前 Vosk + Top-K Speak 方案否决；替代方案与 Vercel 适用性未定）
- 日期：2026-11-15
- 相关需求：REQ-005、REQ-023、REQ-029、REQ-031–REQ-033

## 背景

用户已接受 TTS/Speak 分别 spike，Speak 不能在手机浏览器做本地模型测试，须核对 Vercel 免费硬件与月容量；本地不足则用 OpenAI。压缩可以降低音频体积，但要自然清晰。

## 已确认的试听选择（2026-11-17）

用户先试听免费 Kokoro 与 Supertonic 的四段同文原音，选择 C / Supertonic F1；
随后对照原音和两个压缩版，明确选择单声道 MP3 32 kbps（保持 44.1 kHz）。
本次 17.41 秒样本由 1,536,044 字节减至 70,025 字节，减少 95.44%。
代码、原音、压缩样本与选择记录保存在
[独立实验分支](https://github.com/juanchaopan/lingocurrent/tree/codex/spike-7-validation/spikes/r2)。

这是用户对实际样音的选择，不代表已证明 Supertonic 可在 Vercel Hobby 满足部署、
CPU、内存和月容量要求。用户随后参与了 Speak 真实录音测试并否决当前候选，见下文；#7 保持打开。
OpenAI 朗读仅为免费方案效果不满意后的后备，目前没有运行收费调用。

## Speak 当前候选否决（2026-11-21）

用户实测后明确认为：存在反复无法识别的单词，就不能满足该功能的使用要求，并要求停止测试。
据此否决本次 Vosk lgraph + 严格 Top-K 文字匹配原型，不再要求用户为它补齐原定 10/10/3 样本。
已观察到 seed 的候选为 the cd、the seed 等，currant 的首选为 current，均未通过当前文字匹配。
同音词的拼写不匹配不能直接作为发音错误；本原型没有实现独立的发音正确性判断。

人工标签计数不等于模型通过数。保留已有私人录音、否决依据及独立实验分支，不将实验代码合入 main。
本结论是该已测方案对本产品不适用，不是对所有模型配置的普遍准确率断言。
Speak 替代方案尚未选定，不据此自动启动其他测试、付费调用或云端部署。
TTS 的 Supertonic F1 / 单声道 MP3 32 kbps 听感选择单独保留。

## 其他免费识别候选复测（2026-11-21）

用户明确要求继续比较其他方案。复用原来的 5 条私人录音，本机运行 PocketSphinx 5.0.4
及 faster-whisper 1.2.1 的 Whisper base.en（CPU INT8、单线程、不给目标提示）。
严格文字匹配分别为 0/5 和 2/5；后者识别出 avocado 与 see，seed 返回 C.D.，currant 返回 Cowerings。
两种已测配置均不满足用户标准，不推广为对其全部模型或配置的否决。
完整对比及合成静音、换目标对照、模型版本和局限见实验分支的
[RESULTS.md](https://github.com/juanchaopan/lingocurrent/blob/codex/spike-7-validation/spikes/r2/RESULTS.md)。
原始录音仍在本机，没有重新要求用户录音、上传音频或发起付费调用。
两种方案均只做转写；独立发音正确性判断仍未实现。OpenAI 原始音频判定尚未执行。

## 候选与验证顺序

TTS 按用户最新要求先比较免费第三方库原音，用户选音色后才测试压缩；只有免费方案
效果不满意时才考虑付费 OpenAI，不能将它作为默认先行参照。当前已选 Supertonic F1
及 MP3 32 kbps，实际 Vercel 可行性仍须验证。后备 OpenAI 模型/API 生命周期在需要时
复核，不能将旧 Speech API 示例直接套到 Realtime。

Speak 研究 Vosk 小型可调词图候选与更小模型的质量/兼容性取舍，和 OpenAI 原始录音对照；PocketSphinx 仅备选。Top-K 命中是用户允许的产品路线，K、大小写/拼写规范化、短语和近音误通过率需负样本证据。不得只给识别器唯一目标再以命中率证明效果，路径分数也不当成校准概率。

## 决策提案

引擎都通过应用适配端口调用，所有本地推理也只在 Vercel，不增加独立服务器。spike 要输出真实 Hobby 的部署、包体、冷/热延迟、峰值内存、CPU 时间及参考月负载预算；2 GB/1 vCPU/300 秒与团队免费 CPU 用量分别核对。

TTS 实际样音供用户试听，比较低码率/单声道自然度、体积、时间轴与编码成本。Speak 包含正确、错误、近音、低频词/短语及无效录音；不得仅凭通用 WER 判定短词匹配可靠。具体计划及主要来源见 [候选研究](../architecture/speech-candidates.md)、[TTS 计划](../product/tts-spike-plan.md)、[Speak 计划](../product/speak-spike-plan.md)。完整集成/真实手机与 D-014 仍在 staging。

## 排期与后果

用户在架构定稿后明确执行顺序：先 Design，再 scaffold/准备并推送 GitHub 仓库，由 roadmap 分别创建 TTS/Speak 的 type:spike issue；探针排在依赖其结论的正式实现之前，不在 architecture 结束后立即执行。适配端口允许其他设计/骨架工作先推进。

在证据前保留候选，不作已通过或零成本承载承诺。spike 结果必须回写本 ADR，选定音色/引擎后再正式接入；整体架构获确认也不自动使本 ADR 变为已接受。
