# 语音初步研究

日期：2026-11-15（America/Toronto）。仅记录官方来源提供的候选能力，不代表已验证、已选型或已满足产品要求。

## 当前约束（以第三轮澄清为准）

第三轮明确区分朗读（TTS）和识别用户语音：TTS 比较不同方案让用户试听，不强制使用 OpenAI；语音识别先验证本地库/模型，效果不够再使用 OpenAI。云端 AI API 使用 OpenAI，各环境共用一个 key。微软云端方案不在当前候选范围内，本地模型允许。

当前计算环境限定 Vercel。最新恢复 TTS 音色 demo 的独立 spike，由用户选；D-014 性能和其他正常验证仍在 staging。业务量按每频道时区、各采集时点及该次篇数计算，不固定全站每天 16 篇；30 美元仅为月费用期望，不因达到该金额停用调用。下方候选能力不等于已证明符合运行约束。

OpenAI 接入从[官方 quickstart](https://developers.openai.com/api/docs/quickstart)开始核对，音频能力以[官方 audio guide](https://developers.openai.com/api/docs/guides/audio)为依据。模型是否支持音频输入、接口形式、账户可用性与费用需逐项检查，不能把普通文本模型自动当作发音评估模型。

[当前 TTS 文档](https://developers.openai.com/api/docs/guides/text-to-speech)明确列出旧 Speech API 模型的停用提示，包含 `tts-1`、`tts-1-hd`、`gpt-4o-mini-tts`，并指向 Realtime 迁移路线。实现前再次核对[停用公告](https://developers.openai.com/api/docs/deprecations)与[Realtime 文档](https://developers.openai.com/api/docs/guides/realtime)，不直接把旧示例中的模型定为正式方案。

决策原则：文本解释使用低成本 OpenAI 模型；语音识别与判定先测本地候选，必要时用 OpenAI；语音输出独立比较 TTS 方案。使用相同 OpenAI API key 不要求各项云端任务使用相同模型。OpenAI 可选模型、音色及成本以执行时的官方文档和真实调用为准。[官方价格页](https://developers.openai.com/api/docs/pricing)

尚无实测证据。测试计划见 [voice-validation-plan.md](voice-validation-plan.md)。

## 合并请求与 token

合并例句和四选项的生成可减少往返，并可能减少重复的输入上下文；输入和输出 token 仍分别计量，因此不能只凭少一次请求断言总费用降低。未收藏就预生成选项可能产生未使用输出。[OpenAI 官方价格说明](https://developers.openai.com/api/docs/pricing)

## 后台与锁屏播放

用户已要求设备支持时实现。Media Session API 可连接系统媒体通知及锁屏等控制，但文档标明浏览器支持有限；这不等于已证明所有浏览器都可持续后台或跨文章播放。正式实现需验证实际设备的音频播放、媒体控制、后台衔接及回前台同步。[MDN Media Session 文档](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)

## 本地识别候选

- Whisper：作者公开的语音识别项目，可以作为本地语音路线的研究起点。[作者仓库](https://github.com/openai/whisper)
- Vosk：官方说明其支持离线语音识别及英语，可作为另一条候选路线。[官方介绍](https://alphacephei.com/vosk/)

以上只是识别候选，尚未验证 Vercel 部署适用性、低频单词、短语或用户实际口音。研究判断：识别结果正确不等于已证明发音判定可靠，需在 staging 加入近音错词、错误目标和无效录音作负对照。本地候选也应与 OpenAI 音频判定对照，不能只比较转写文本。

## 初始研究：发音判定（提供方约束更新前）

微软的 Pronunciation Assessment 支持指定参考文本，并提供音素级准确度等评估结果，可作为“已知目标词 + 实际录音”路线的候选。[官方说明](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)

研究判断：该能力值得与用户提出的“录音 + 目标词交给音频 AI”做对比验证。不能仅凭转写字符串相等判断发音正确；也不能仅凭官方支持该功能便承诺对低频词可靠。需用常见词、低频词、短语、相近错词、可接受口音、静音与噪声构成测试集，比较误接受率和误拒绝率。产品需要正确/错误二元学习结果，但技术失败是否允许重试仍须确认。

## 自托管 TTS 候选

Kokoro-82M 作者模型卡说明其为 8200 万参数的开放权重 TTS，权重采用 Apache 2.0 许可，并提供英语生成示例，可列为本地或自托管候选。[作者模型卡](https://huggingface.co/hexgrad/Kokoro-82M)

尚未实测：实际执行耗时、自然度、长文跨句韵律、句子时间轴、例句即时播放和部署兼容性。在已确认的 Vercel 计算约束内设计模型执行方式，再与其他候选试听和测试；本记录不构成模型选型结论。
