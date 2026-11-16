# 朗读与语音识别：候选研究次序

日期：2026-11-15（America/Toronto）。用户要求 AI 推荐研究次序，最终以实际试听/录音证据决定质量；没有本项目生成的样音、识别测试或部署结果，不将本表当作“已经找到质量最好”的结论。

## 两个不同任务

| 用途 | 输入与输出 | 验证核心 |
|---|---|---|
| TTS，机器朗读 | 正文/例句文字 → 可保存的朗读音频 | 自然度、长时间听读舒适度、逐字准确、数字与缩写、句子映射 |
| Speak，识别/匹配用户录音 | 用户录音 + 目标词/短语 → 正确/错误或技术无效 | 近音误判、罕见词、可接受口音、无效录音，以及 Top-K 规则 |

此前 Vosk、PocketSphinx 属于第二项，不是 TTS。两者最终可以用完全不同的引擎。用户已取消浏览器本地识别，只研究 Vercel 服务端库或 OpenAI。

## TTS 研究次序，AI 推荐

比较顺序不是预先认定的质量排名。用同一段已定的英文文本，先得到质量参照，再比较轻量 CPU 候选；用户试听选择。

1. **当前 OpenAI 高质量音频路线作为参照**：评估 GPT-Realtime-2.1 音频输出与合适音色，必要时比较 mini 的质量/费用。服务器仅调用 API，不在 Vercel 跑模型；OpenAI 使用费用独立于部署支出。输出必须忠实读原文，不能自由改写，仍要测完整保存、句子对齐与生成耗时。
2. **Kokoro-82M**：英语试听优先评估作者音色列表中合适的音色，例如 af_heart，再比较用户偏好的其他音色。检查 ONNX/CPU 版本的准确输出、韵律与资源。82M 参数是候选特征，不代表可自动装进函数、也不代表免费 CPU 足够。
3. **Supertonic 3**：作为轻量 ONNX 候选补充对照，核对包大小、原生运行库、许可与可用音色；作者硬件上的速度不能当作 Vercel 实测速度。

依据：[OpenAI Realtime-2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)、[Realtime 音频与音色](https://developers.openai.com/api/docs/guides/realtime-conversations)、[Kokoro 模型卡](https://huggingface.co/hexgrad/Kokoro-82M)、[作者音色说明](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)、[Supertonic 3 作者模型卡](https://huggingface.co/Supertone/supertonic-3)。这些来源证明候选能力与作者描述，不构成统一条件下跨引擎质量比较。

[OpenAI 当前 TTS 文档](https://developers.openai.com/api/docs/guides/text-to-speech)注明 tts-1、tts-1-hd、gpt-4o-mini-tts 将于 2027-01-06 关闭，并指向 Realtime mini 路线；不能把旧模型示例作为长期默认。新 Realtime 工作流也不能把模型名直接替换进旧的 speech 端点。

沿用 TTS 已确认计划：首轮控制在三种方案，3–4 个同文可播放 demo，总时间盒最多两小时、两轮试听；生成时再核对模型可用性与预算，最终由用户选。候选明显无法在 Vercel 满足包体/内存/时限时直接记录不适用，不扩大成额外模型服务器。

## Speak 研究次序，AI 推荐

正式运行仍以符合要求的服务端本地路线优先，不合格再走 OpenAI；比较时可以用少量 OpenAI 样本作对照，人工标签才是测试依据，不能把模型答案当作真值。

1. **Vosk 动态词汇英语候选**：先做静态资源筛选，比较官方 128 MB lgraph 与 40 MB small 英语模型。作者同一 LibriSpeech 测试表中列出的 WER 分别约 7.82 与 9.85，提供先看较强模型的依据，但不是短词/用户口音的准确率承诺。若 128 MB 候选完整运行包或内存不适用，再评估 40 MB；不默认下载 1.8 GB 大模型来突破普通函数限制。
2. **OpenAI 原始录音 + 目标的判定**：用同一人工标注样本检查能否改善本地的近音/罕见词失败，并记录费用。具体支持原始音频输入及所需输出形式的模型在验证时按官方能力选择，不把普通文本模型当音频判定器。若本地不合格，可按既有授权转此生产路线。
3. **PocketSphinx，按需备选**：支持传统解码和 N-best，但当前无证据证明对本产品词表优于 Vosk；仅在前两条未解决问题且用户允许继续研究时投入，不为凑齐候选无限测试。

依据：[Vosk 官方模型表](https://alphacephei.com/vosk/models)、[多候选示例](https://github.com/alphacep/vosk-api/blob/master/python/example/test_alternatives.py)、[PocketSphinx API](https://pocketsphinx.readthedocs.io/en/latest/pocketsphinx.html)、[OpenAI 音频能力](https://developers.openai.com/api/docs/guides/audio)。

输入可包装为“录音 + 目标”，识别引擎返回候选后由服务端匹配。Top-K 的 K、规范化和分数阈值不由本表预先锁定；不得把目标设置为唯一允许答案后再宣称正确识别。N-best 原始得分不等于校准概率，K 增大可能增加误接受，必须对照近音、错误目标与无效录音。

质量之外，所有候选还需核对 Vercel 的完整包体、冷启动、P95 延迟、CPU 与内存额度。转写 WER、Top-K 命中和发音质量不同，不以单一公开分数断言谁对本项目“最好”。

## 验证位置

用户已明确选择 TTS、Speak 分别做候选 spike；Speak 须在真实 Vercel Hobby 检查硬件、完整包体、冷启动、CPU/内存和月免费容量，见 [Speak spike 计划](../product/speak-spike-plan.md)。D-014 性能和完整流程仍在 staging，不增加独立全站性能 spike。当前只记录计划，未下载模型、生成样音、请求录音或发起付费调用。
