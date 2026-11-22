# 单词识别结果矩阵

同一批 5 条已保存录音；仅忽略大小写、标点与多余空格，要求整个候选匹配。

| 方案                                       | ship         | avocado      | see          | seed         | currant      |
| ------------------------------------------ | ------------ | ------------ | ------------ | ------------ | ------------ |
| Vosk lgraph                                | Top 5 内匹配 | Top 1 匹配   | Top 5 未匹配 | Top 5 未匹配 | Top 5 未匹配 |
| PocketSphinx 5.0.4                         | Top 5 未匹配 | Top 5 未匹配 | Top 5 未匹配 | Top 5 未匹配 | Top 5 未匹配 |
| Whisper base.en（CTranslate2 真实前5候选） | Top 5 内匹配 | Top 1 匹配   | Top 1 匹配   | Top 5 未匹配 | Top 5 未匹配 |
| OpenAI                                     | 尚未实际识别 | 尚未实际识别 | 尚未实际识别 | 尚未实际识别 | 尚未实际识别 |

Whisper 此行直接取得 CTranslate2 的真实前5个束搜索结果，不是先前只返回一个转写的封装接口。OpenAI 尚未取得结果时不计失败；仅有一个转写时也不虚填 Top 5。原音与目标词的判断结果不混作候选排名。

原始录音仍保留在本机。[候选明细](evidence/asr-word-matrix.json)。
