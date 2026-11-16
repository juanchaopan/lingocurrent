# ADR-0018 合并查词缓存、共享例句与无业务版本

2026-11-16最终确认：用户明确“ok, finalize design”。Design已确认并定稿，最新复习只保留review_progress；删除review_sessions/review_session_items/review_prompts/review_attempts，不设phase或短练标记。答错round减1最低0并延10分钟，答对加1查间隔；逐题实时查询，通用mutation_receipts仅作有期限的请求去重。下方历史记录中的旧表、共享例句或待审状态均不优先于当前data-model/API及Design确认记录。实现、RSS/语音Spike、部署和真机验证尚未执行。

2026-11-16后续直接修订：下方“四表/共享例句/current_example_id”方案已由用户纠正，保留为设计沿革。当前为五表：lookup_entries、examples(lookup_entry_id FK)、vocabulary_cards、vocabulary_examples(vocabulary_card_id FK)、translation_sets(card_id PK)。删除当前例句指针，收藏复制整组子例句。用户界面一次展示一个，手机/平板横滑，电脑左右箭头，下方1 / N，临时显示索引不写数据库；无业务版本及跨来源同句缓存复用维持。当前实施以data-model/API/experience为准。

- 日期：2026-11-16。
- 状态：用户直接要求，设计已按此修订；Design整体已于2026-11-16确认。
- 修订ADR-0015中关于文章/词卡/复习业务版本及分离例句存储的设计，不改变技术栈、临时任务完成即删或个人文本保留规则。

用户要求相同句子选中相同词/范围时，无论来自文章还是例句复用缓存；不需要文章修订版本，不为并发新增词义版本表；词卡保存原句和选区，统一例句集合支持一词多例句；翻译题组为同词同义一套四选项。

现设计收敛到lookup_entries、examples、vocabulary_cards、translation_sets四张核心表。合并lookup_contexts和lookup_entries；删除kind/origin_id/origin_version以及vocabulary_lexemes；合并lookup_examples/vocabulary_examples为examples。Lookup与词卡各自保存current_example_id，可引用同一不可变例句，也可独立切换当前例句；不复制两套例句文本。原句/释义按用户要求分别作为查词缓存与收藏快照保存。

文章正文入库后固定，不提供编辑修订功能，删除content_version。Lookup/词卡/题组/复习进度及相关接口不设version/expectedVersion等业务字段；不把时间戳/hash/新建token改名当成版本机制。Translation以card_id为主键，词卡的唯一性已经确定同词同义，不再重复保存词义或题组版本。

并发责任在应用服务：使用数据库提供的跨实例短事务锁及唯一约束，提交前重读实际候选和当前例句/存在性，AI在事务外；候选变化重新匹配，不生成重复词义卡。复习用锁内实际进度/可答条件及通用operationId去重，不保存题目或作答历史；删卡同步清关联记录，迟到回调不upsert复活。数据库机制服务于应用用例，不新增持久协调表，也不把单进程锁当跨实例保证。

成本是同一句查多个词时会在合并Lookup中重复原句，以及服务层需明确处理实际数据变化；这是用户选择的简单结构。哈希仅用作内容索引/缓存校验，例句ID表示不同例句身份，不是词卡历史版本。引擎/部署/任务协议格式等技术版本不代表业务修订，任务租约fence继续防过期worker提交。

同步数据模型、逐表示例、API、状态机、需求与验证。后续验证覆盖跨文章/例句同句命中、不同选区不误命中、共享例句独立切换、同义并发收藏、跨设备作答仅提交一次、删卡缓存不丢失、文章删除后无来源依赖。当前只有文档，无SQL迁移或实测结果。
