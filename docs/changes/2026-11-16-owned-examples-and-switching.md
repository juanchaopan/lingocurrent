# 例句按父项归属与本地切换

2026-11-16用户直接澄清：Lookup父行不需要current_example_id，examples用lookup_entry_id关联；Vocabulary有自己的vocabulary_examples子表，用vocabulary_card_id关联。两处lemma为规范词形。缓存与词卡均有多少例句就可查看多少例句。

用户随后明确空间处理：手机/平板在例句区域左右滑动，电脑在句子两侧有前/后箭头，下方1 / N；一次显示一个，全部均可到达。因此当前索引只在页面内存，不写数据库、不调用AI、不提交复习，仍保持单题单屏。可访问按钮/键盘作为手势替代；选词/竖滚不误翻，录音时不切换，首末禁用、不循环。

核心现为lookup_entries/examples/vocabulary_cards/vocabulary_examples/translation_sets五表，替代上一轮共享四表及当前指针；保留无业务版本、同用户同句同选区跨来源缓存复用。子例句不重复存单词/词性/词义或owner，授权由各自父行取得。收藏复制当时整组例句，后续两处独立；刷新只替换选定子行，失败保持；删卡清自己的子例句和复习，不删Lookup及其例句。嵌套Lookup自己保存原句/范围，不FK依赖原例句。

已同步需求/刷新规则/术语、ADR-0018后续修订说明、数据/API/状态机/体验/示例/验证、仓库mockup及聊天镜像。Node状态检查覆盖切换、边界、答案保持、目标隐藏、两处例句独立与模拟触控仲裁；本地文档链接及空白检查，无DB或真机结果。无Issue/RSS调查、无finalize或commit。
