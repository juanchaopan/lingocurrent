# 单词识别结果矩阵

同一批 5 条已保存录音；按用户要求统计候选中是否包含完整目标单词，忽略大小写、标点和多余空格。the seed 算包含 seed，seedy 不算。此前原型用整条候选相等，本表改用单词出现统计，未改变实验代码的生产匹配策略或采用结论。

| 方案                                       | ship                       | avocado                  | see                      | seed                     | currant                  |
| ------------------------------------------ | -------------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| Vosk lgraph                                | Top 1 匹配                 | Top 1 匹配               | Top 5 未匹配             | Top 5 内匹配             | Top 5 未匹配             |
| PocketSphinx 5.0.4                         | Top 5 未匹配               | Top 5 未匹配             | Top 5 未匹配             | Top 5 未匹配             | Top 5 未匹配             |
| Whisper base.en（CTranslate2 真实前5候选） | Top 5 内匹配               | Top 1 匹配               | Top 1 匹配               | Top 5 未匹配             | Top 5 未匹配             |
| OpenAI GPT-Realtime-2.1                    | 客户端解析失败，未取得候选 | 因首条错误停止，尚未执行 | 因首条错误停止，尚未执行 | 因首条错误停止，尚未执行 | 因首条错误停止，尚未执行 |

Whisper 此行直接取得 CTranslate2 的真实前5个束搜索结果，不是先前只返回一个转写的封装接口。

OpenAI 应分别记录 Top 1 的实测结果和“原生 Top 5：未提供”。官方转写接口返回一份转写，部分模型可附带已输出 token 的 logprobs；它们不是五个单词候选的排名。此前实验提示要求 Realtime 模型生成最多5个备选，这不等同于解码器 N-best，不能作为本表同口径的 Top 5。当前调用未跑通，尚无有效 Top 1 结果，也没有模型生成候选的实测结果。[官方转写接口](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create)。

给定目标词后，对录音是否匹配以及发音是否可接受的判断是另一项任务，尚未完成。current 与 currant 同音，本表拼写未命中不能直接视为发音错误。

原始录音仍保留在本机。[候选明细](evidence/asr-word-matrix.json)。
