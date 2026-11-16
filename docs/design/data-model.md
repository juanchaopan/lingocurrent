# 数据结构与所有权

2026-11-16最终确认：用户明确“ok, finalize design”。Design已确认并定稿，最新复习只保留review_progress；删除review_sessions/review_session_items/review_prompts/review_attempts，不设phase或短练标记。答错round减1最低0并延10分钟，答对加1查间隔；逐题实时查询，通用mutation_receipts仅作有期限的请求去重。下方历史记录中的旧表、共享例句或待审状态均不优先于当前data-model/API及Design确认记录。实现、RSS/语音Spike、部署和真机验证尚未执行。

状态：2026-11-16用户已确认，Design定稿。这里是 schema 规格，尚未生成 Drizzle 或执行 SQL。模块名和事务边界遵循 ADR-0015。所有时间为 `timestamptz`/UTC；ID 为随机 UUID；文本非空和范围约束由 Zod + SQL 检查共同保证。业务服务只通过所属模块端口修改数据。

2026-11-16修订：source_icons、word_tts与列表快照加入目标schema；导航/列表查询与[本轮修订](input-and-density-revision.md)一致，尚无存量数据迁移。

2026-11-16用户澄清采集原意：Source/Channel/采集计划是稳定配置；到点建立临时频道任务，完成即删除任务和全部明细。不保留永久采集运行记录；此前 collection_runs/run_article_links 设计撤回。具体流程及逐表样例见[采集任务与查词数据示例](data-examples.md)。此后查词/词卡简化以本页下述用户修订为准；members保留最小Clerk身份映射及授权状态，不复制账号资料。

## 身份、来源与文章

| 表 / 主人 | 主要字段 | 约束与索引 |
|---|---|---|
| members / identity | id, clerk_user_id, status(active/revoked), created_at | UNIQUE clerk_user_id；逐请求核对有效成员，客户端 user_id 不作为授权依据 |
| sources / content | id, name, allowed_origin, icon_id?, terms_reviewed_at, enabled | 仅已确认来源可enabled；Source名称/图标独立于频道category |
| source_icons / content | id, bytes(bytea), mime_type, byte_size, checksum | 小PNG/WebP等建议≤64KiB；导入Base64解码，按checksum缓存图片，不参与音频FIFO |
| channels / content | id, source_id, name, feed_url, category, timezone, enabled | source FK RESTRICT；不同 feed URL 为独立频道；IANA 时区 |
| channel_schedules / content | id, channel_id, local_time, target_count, enabled, next_run_at | UNIQUE(channel_id,local_time)；target_count>0；索引(enabled,next_run_at) |
| source_items / content | id, source_id, external_key_hash, first_seen_at, article_id? | UNIQUE(source_id,external_key_hash)；article_id 删除后置空；只留去重标识，不留淘汰正文 |
| articles / content | id, channel_id, source_item_id, source_url, title, category_snapshot, collected_at, published_at?, body_hash, body_text, state, current_asset_id? | UNIQUE(source_item_id)；state preparing/ready；仅 ready 可读；索引(state,collected_at DESC,id DESC) |
| article_sentences / content | article_id, sentence_index, paragraph_index, text, body_start, body_end, start_ms?, end_ms? | PK(article_id,sentence_index)；正文中范围与原文切片一致；发布前时间完整、非负且有序 |
| visits / reading | owner_id, article_id, first_opened_at, last_opened_at | PK(owner_id,article_id)；索引(owner_id,last_opened_at DESC,article_id DESC)；文章删除级联 visits |

正文为段落内句子以单个空格连接、段落以两个 LF 连接的规范文本。句子切片保存精确范围，不从 UI 换行重算。`body_fts` 为基于 body_text 的 English tsvector + GIN 索引；仅当前 ready 文章参与查询。短语检索契约见 API。

ready 不是仅靠 CHECK 能证明的跨表不变量：application 发布事务校验完整正文/每句时间轴/完整音频后才写 ready。article FK/cascade 只可传播至句子、访问和专属队列项；不得传播到个人上下文、解释、词卡或进度。

## 个人文本、词义与词卡

2026-11-16最新用户修订：保留合并的Lookup缓存和无业务版本设计；撤回共享例句与current_example_id。缓存解释和收藏词卡各自一对多拥有例句；用户可查看全部例句，一次显示一个，通过手机/平板左右滑动、电脑左右箭头切换，下方显示1 / N。显示索引仅在页面内存，数据库不保存当前例句指针。

| 表 / 主人 | 主要字段 | 约束与索引 |
|---|---|---|
| lookup_entries / lookup | id, owner_id, context_text, context_hash, selection_start, selection_end, selected_text, lemma, lemma_key, pos, meaning_key, meaning_zh, accepted_forms, created_at | UNIQUE(owner_id,context_hash,selection_start,selection_end)；相同用户同句同选区跨来源复用；无kind/origin/version/current_example_id |
| examples / lookup | id, lookup_entry_id, text, target_ranges, content_hash, created_at | FK lookup_entry_id→lookup_entries；UNIQUE(lookup_entry_id,content_hash)，核对原文/范围；不重复保存owner/lemma/pos/meaning，通过父行取得；按created_at,id稳定排序；一条lookup有多个例句 |
| vocabulary_cards / vocabulary | id, owner_id, lemma, lemma_key, pos, meaning_key, meaning_zh, accepted_forms, context_text, selection_start, selection_end, selected_text, created_at, updated_at | UNIQUE(owner_id,lemma_key,pos,meaning_key)；保留收藏原句/范围；无version/current_example_id/lexeme辅助表 |
| vocabulary_examples / vocabulary | id, vocabulary_card_id, text, target_ranges, content_hash, created_at | FK vocabulary_card_id→vocabulary_cards ON DELETE CASCADE；UNIQUE(vocabulary_card_id,content_hash)，核对原文/范围；通过父行取得owner/词义；按created_at,id稳定排序；每张词卡有多个自己的例句 |
| translation_sets / vocabulary | card_id, options, correct_option_id | card_id为PK/FK，授权从词卡取得；同词同义一套四选项，未答不返回正确项，无version/重复词义字段 |

context_text为完整相关句子片段，跨句连续选词包含相关完整句，不复制整篇文章。selected_text等于context_text.slice(start,end)。缓存hash只基于规范句子，不含来源/文章/例句ID；统一存储换行但不改变空白、大小写或标点，转换时同步选区，视觉折行不入键。哈希相同仍核对原文。相同句子和选区无论来自文章、Lookup例句或词卡例句均复用同一lookup；句中另一个选区另建一行，允许重复原句以简化结构。

lemma是AI按语境判断的规范词形，例如动词原形、名词单数及短语规范写法，不机械截词尾；原文屈折写法保存在selected_text。examples不保存单词本身或词义身份，通过lookup_entry_id取父行；vocabulary_examples同理通过vocabulary_card_id取父行。父子一对多不需要中间关联表；子表不重复保存owner_id，所有读取/修改必须join父行校验当前用户。

收藏将当时的原句、范围、规范词、词性、词义和全部例句复制为词卡及其vocabulary_examples；每个子行使用新ID，不跨模块共享可改实例。这里复制例句是用户指定的独立生命周期：之后缓存例句刷新不改变词卡，词卡刷新不改变缓存，删词卡及其例句不删Lookup。没有全局共享例句集合，没有当前例句选择字段，也没有例句版本历史。

一个父项可有N条例句，DTO返回有序数组examples。当前页面exampleIndex从0开始，切换只更换显示内容并更新1 / N，不写数据库、不调用AI、不提交/更改复习成绩。刷新按钮只替换当前可见的那一条例句（由子行ID定位），不清空其他例句；新生成的多个例句可作为同父项多行保存，不能把“支持多个”擅自等同于“每次刷新自动追加”。刷新失败保留该行及其他例句，重复内容复用/去重；例句ID保持其身份，没有指针历史。嵌套查词持有自己的context_text，刷新来源例句不覆盖既有查词缓存。

target_ranges为UTF-16 code unit半开区间[start,end)，可以多段，排序不重叠，标记例句所有需隐藏目标。不得切开代理对；服务端验证切片与允许词形。lemma_key仅作大小写/Unicode NFC/空白折叠后的候选索引，不代表词义；meaning_key为稳定词义身份，不是版本或中文字符串hash，也不另建词义主表。新查词AI仅接收当前有效词卡的词义，删除后的卡不能作为当前词库候选；缓存本身仍保留独立解释，再收藏必须重查当前有效词义，不能直接信任历史meaning_key跳过核对。

应用服务负责并发冲突：同用户同lemma的收藏/替换/删除使用跨实例共享的短事务锁和唯一约束串行提交，锁是数据库事务提供的临时机制，不新建lexeme/版本表，不用单进程内存锁。AI生成在事务外；最终锁内重读实际词义/本次目标例句行等数据，如有效候选已变化就释放锁、重新匹配后重试。首次收藏事务只允许一张同义卡；同时收藏的另一请求返回重复确认，不生成第二张卡。生成失败保留旧值。迟到刷新只更新仍存在、含义仍一致且目标例句行仍对应本次生成前读取内容的记录，冲突返回409，不把hash/timestamp改名当成expectedVersion。删除不upsert，重新收藏新UUID和三个0轮。

词卡刷新后失效客户端题面查询缓存，不在数据库存待答题。复习按card_id/mode从服务端读取当前答案，锁定进度并核对可答条件后更新；通用operationId去重，不增加题目表、作答历史或进度版本列。Speak事务外判定，最终提交前核对实际词义/允许答案仍与判定输入一致，否则409并重新取题，不计错。引擎/协议格式标识与供应商对象身份属于技术配置。

## 复习进度与逐题提交

2026-11-16最终精简：复习只保留review_progress；没有session、题目表、作答历史表、phase或is_retry。round表示当前轮次进度，可以增加或回退，不是历史答对总次数；0轮答错仍为0。每次下一题实时查询，不冻结本批词卡集合。

| 表 / 主人 | 主要字段 | 约束与索引 |
|---|---|---|
| review_progress / review | owner_id, card_id, mode, round, due_at?, last_attempt_at? | PK(owner_id,card_id,mode)；mode speak/spell/translate；0≤round≤统一常量表终点；due_at=NULL仅允许round=0或终点，中间轮次必须有due_at，终点必须NULL；索引(owner_id,mode,due_at,card_id) |

未开始=round=0且due_at=NULL；已完成=round等于统一常量表终点且due_at=NULL；其余为进行中。round=0且due_at非空表示已经答过但当前进度仍为0，不计new。到期只看due_at≤DB now；未来due不出题。Vocabulary New要求三个模式都未开始，Archived要求三个都完成，其他Ongoing，状态均派生而非列。

点击模式按钮及每次取下一题，查询该用户该mode的未完成进度：due_at≤now，或者round=0且due_at=NULL。先已到期（due_at,card_id升序），再新词（词卡created_at,id升序）；无每日额度、无session/cohort。期间新增或刚到期的词可在下一次查询时进入。不满足条件返回当前没有可答题及最近未来due_at，不为用户自动等待。无论上次如何作答，这次答对一律round+1：1/2/3/4/5/6轮分别等待1/2/4/7/15/30天，终点7轮清due_at。答错一律round=max(0,round−1)、due_at=now+10分钟；错误后再错再次减1但不低于0。技术失败/未提交不改进度。

返回题面只读词卡/例句/题组，不写表，正确答案不返回客户端。提交以card_id、mode、answer、operationId定位，服务端读取当前答案并判定，短事务锁卡/该模式进度，重查存在性与可答条件后只更新原进度行。第一份有效提交把due_at设为未来或完成，紧接的并发提交不可再次推进。通用mutation_receipts复用24h可配置去重窗口；已提交同ID只确认已保存并重读当前进度，不保存或保证重放原判定。超过窗口不自动重放旧答卷，要求刷新并显式重新作答；不承诺永久逐次审计或旧题恢复。关闭仅退出页面，已受理/未知操作保留operationId核对。

删除词卡：同事务删translation_sets、三模式progress、词卡及所属vocabulary_examples，失效这些例句音频引用；独立lookup_entries及examples保留。迟到回调不能insert/upsert复活，重收藏新UUID和三条round=0/due_at=NULL。子例句ID经父行鉴权。

## 播放队列与列表临时快照

这两组属于文章连续播放和列表翻页，不是复习session，本轮不顺带改变其设计。

| 表 / 主人 | 主要字段 | 约束与索引 |
|---|---|---|
| playback_queues / reading | id, owner_id, query_snapshot, start_ordinal, created_at, expires_at | 建议24h临时队列；冻结Articles完整匹配顺序；不承诺持久跨设备播放进度 |
| playback_queue_items / reading | queue_id, article_id, ordinal | PK(queue_id,ordinal)；跨页定位；文章删除级联item，空洞跳过，不插新文章补齐 |
| list_snapshots / 查询所属模块 | id, owner_id, kind(articles/vocabulary), query_hash, query_snapshot, as_of, expires_at, total_count | 建议15分钟；仅冻结列表查询顺序，不代替学习记录 |
| list_snapshot_items / 查询所属模块 | snapshot_id, resource_id, ordinal | PK(snapshot_id,ordinal)；只存资源ID/顺序；支持page/cursor，删除资源失效对应项 |

## 临时任务、资产与用量

| 表 / 主人 | 主要字段 | 约束与索引 |
|---|---|---|
| pending_jobs / content | id, kind(channel_collect/article_tts/example_tts/word_tts), dedupe_key, payload_version, payload, resource_id, state, attempts, retry_at, lease_until, fence, checkpoint, last_error_code, created_at | UNIQUE(kind,dedupe_key)；只留未完成；领取索引(state,retry_at,lease_until)；频道payload含channel/schedule/本次时点/篇数/本次配置快照；成功与业务提交同事务删除 |
| pending_job_items / content | job_id, ordinal, external_key, source_url, state(pending/saved/skipped), article_id? | PK(job_id,ordinal)；仅channel_collect的临时逐篇检查点；同任务external_key唯一；job FK ON DELETE CASCADE；article FK ON DELETE SET NULL；不存正文、不做历史归属；最终完成时与父任务一起删除 |
| media_assets / media | id, object_key, object_version, byte_size, duration_ms?, first_created_at, checksum, state(staging/ready/retiring), producer_job_id?, producer_fence?, retire_attempts, retry_at | UNIQUE(object_key,object_version)；duration生成时记录，ready文章必需已知有限正值，详情不额外远程探测；retiring不保留正文 |
| media_references / media | id, asset_id, resource_kind, resource_id, access_scope, cache_key | UNIQUE(cache_key)；article 专属必需资产与 example 可重建引用分开；通过模块存在检查授权 |
| storage_scope / media | id, capacity_bytes, observed_bytes, observed_at, reserved_bytes | 行锁做并发容量预留；所有写音频路径共用；平台实际计量另核对 |
| storage_reservations / media | id, scope_id, job_id, fence, reserved_bytes, expires_at | UNIQUE(job_id,fence)；租约内续期，释放前检查已有 staging 对象 |
| usage_operations / usage | id, owner_id?, kind, resource_kind?, resource_id?, environment, trace_id, created_at | 资源 ID 是相关信息，不对文章/卡设置删除级联；避免持久原始 prompt/录音 |
| usage_attempts / usage | id, operation_id, provider, model, engine_revision, provider_request_id?, attempt_no, status, input_tokens?, cached_input_tokens?, output_tokens?, audio_seconds?, cpu_ms?, byte_count?, currency, estimated_cost?, price_version?, price_units?, started_at, finished_at?, error_code? | UNIQUE(operation_id,attempt_no)；每次实际外部尝试一行，pending/succeeded/failed/unknown；NULL 不当 0；provider usage 与估计值分列 |
| mutation_receipts / 各用例所属模块 | owner_id, operation_id, operation_kind, request_digest, state, lease_until, fence, result_resource_id?, expires_at | UNIQUE(owner_id,operation_id)；claimed/committed/unknown；与业务提交同事务更新；建议24h过期清理，不存卡/题面文本，不是工作队列 |

调度在同一短事务锁定到期schedule、插入channel_collect任务并推进next_run_at；完成任务删除后仍不会因重复心跳重建同一时点。采集每篇的事务保存source_items/文章/句子、唯一article_tts任务并更新临时明细。采集完毕且没有待重试明细时，校验当前租约后删除频道任务及全部明细；来源确实不足允许少采，不用重复文章补数。频道任务完成表示正文保存及音频任务可靠交接，不等待所有音频生成。文章TTS任务独立留在同一pending_jobs，音频/时间轴完整并发布时删除；不是保留已完成的频道任务。文章不保存永久job_id或run_id；未完成/失败任务保留以恢复。明细状态是临时恢复检查点，任务总数/成功数按明细派生，不另存永久计数。

模型计价为可版本化配置，保存生效版本/单位和估算金额（decimal，非浮点）；provider invoice/billed cost 若未提供保持 NULL。无最新价格证据时不填估计数；不把 Vercel/Neon 所有月费用硬摊为“每次 API 真实费用”。本地尝试仍记录耗时/引擎，外部重试分别记账；媒体字节/观测也可用 operation 关联。

文章不存word_count/generated column，详情按收到的正文临时计算。word音频key含规范文字/引擎/音色/编码版本及访问scope，例句key独立；引用从有效lookup/card授权，清缓存不清文本。Vocabulary状态/nextRound仍派生于三行progress的round/due_at，不另存冗余allNew/archived/nextRound列。中文搜索先owner范围FTS+绑定子串匹配，规模证据需要时验证额外索引。Visits原PK已保证同用户同文一行，upsert仅更新最后时间，不append访问事件。

## 删除矩阵

| 触发 | 同事务变化 | 保留 |
|---|---|---|
| 淘汰文章当前必需音频 | 删文章/句子/时间轴/visits/播放队列项/专属引用；删其文章专属 pending job/预留并 fence 失效，频道临时明细article_id置空但不重抓；资产转 retiring | source_items 最小去重键、lookup 所有文本、全部个人词卡/进度、独立 usage |
| 淘汰例句音频 | 失效音频引用、资产转 retiring | 例句行、解释/词卡/进度；下次点击重建 |
| 淘汰词头音频 | 失效词头音频引用、资产转retiring | 规范词/短语、解释、词卡与进度；下次点击按需重建 |
| 删除词卡 | 词卡/题组/该卡三模式进度、客户端题面缓存失效；仅删除所属vocabulary_examples及其引用，独立examples保留 | 独立 lookup 文本；同词其他义和其他用户 |

模块 FK 应限定 owner，跨用户资源访问统一 404。成员移除仅撤销访问，账号数据删除政策未在本阶段擅自新增。删除文章、词卡和各自例句之间的 cascade 路径必须由真实 DB 集成测试审核。
