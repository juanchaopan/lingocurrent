# 临时采集任务与个人查词数据示例

2026-11-16：响应用户数据审阅。数据均为虚构说明，不是SQL或已运行数据库。任务生命周期为用户直接纠正的原意；个人查词部分已按用户后续要求重写为五张核心表，无业务版本和来源区分；members精简仍未顺带确认。下文U1、A1、C1等是实际UUID的短别名，H(...)是实际计算的hash，不是额外存一份输入文本。

## 稳定配置与临时任务

Source/Channel及采集计划是相对稳定、可以修改或删除的配置，不是每次执行新增一份。以S1来源、CH1科技频道，每天06:00取3篇为例；来源名称和URL只是示意，不代表已经验证可用的全文RSS。

| 表 | 示例行 | 生命周期 |
|---|---|---|
| sources | id=S1，name=示例站点 | 稳定配置 |
| channels | id=CH1，source_id=S1，feed_url=配置的频道RSS，category=Technology | 稳定配置 |
| channel_schedules | id=SCH1，channel_id=CH1，local_time=06:00，timezone来自频道，target_count=3，next_run_at=本次到期UTC | 稳定配置及下一触发位置 |
| pending_jobs | id=J1，kind=channel_collect，resource_id=CH1，dedupe_key=SCH1/本地日期/06:00，payload含时点与篇数3，state=pending | 到点插入，采集完成可靠交接后删除 |
| pending_job_items | job_id=J1，ordinal=1，external_key=上游键1，source_url=URL1，state=pending，article_id=NULL | 临时逐篇检查点，随J1删除 |
| pending_job_items | job_id=J1，ordinal=2，external_key=上游键2，source_url=URL2，state=pending，article_id=NULL | 同上 |
| pending_job_items | job_id=J1，ordinal=3，external_key=上游键3，source_url=URL3，state=pending，article_id=NULL | 同上 |

到点创建J1与推进SCH1.next_run_at在同一事务，锁定并检查到期值；重复心跳即使遇到J1已完成删除，也不能重建本次任务。不新增永久occurrence/运行历史来防重。

每篇正文处理成功的事务写source_items、articles、article_sentences，创建同一pending_jobs内的article_tts任务，并将对应临时明细改为saved且写article_id。例如完成第1篇后，明细1为saved/A1，明细2、3仍pending；崩溃后从未完成明细继续，不重复处理第1篇。来源已处理项为skipped，不用重复文章补够3篇；确实不足时允许少采，可重试失败继续保留未完成任务。

全部采集工作完成并可靠交接音频任务后，校验租约，删除J1及其三条明细。articles中的A1/A2/A3和各自TTS任务保留；没有永久run_id/job_id关联。TTS不是已完成频道任务的归档，而是还有实际工作的独立任务，完整音频和时间轴就绪、文章发布时各自删除。

| 时间点 | 频道任务J1 | J1明细 | 已保存文章 | article_tts任务 |
|---|---|---|---|---|
| 到点，已选3篇 | 1行 | 3行pending | 0篇 | 0行 |
| 第1篇保存完成 | 1行 | saved 1行、pending 2行 | A1 | A1的1行 |
| 3篇全部保存，尚无音频任务完成 | 已删除 | 全部删除 | A1/A2/A3，preparing | 3行未完成 |
| 3篇音频全部完成并发布 | 不存在 | 不存在 | A1/A2/A3，ready | 全部删除 |

现稿collection_runs和run_article_links撤回，不改名后继续保存成功记录，也不另建完成任务归档。调用用量记录只承担既定计量职责，source_items只承担来源去重职责。

## 查词与收藏的完整数据

2026-11-16最新用户修订：父表不存current_example_id；缓存和词卡各有一对多例句。以下五表无业务版本，ID为实际UUID的短别名。显示第几个只属于页面状态。

用户U1在原句“The community remained resilient after the storm.”选中resilient，范围[23,32)，解释为adjective、有韧性的；能恢复的，规范词形resilient。假设缓存里已有两个例句，随后收藏：

### lookup_entries

| id | owner_id | context_text | selection_start/end | selected_text | lemma | pos | meaning_key / meaning_zh |
|---|---|---|---|---|---|---|---|
| L1 | U1 | The community remained resilient after the storm. | 23 / 32 | resilient | resilient | adjective | M1 / 有韧性的；能恢复的 |

其他字段：lemma_key=resilient，accepted_forms=["resilient"]，context_hash=H(规范原句)，created_at=t0。没有来源类型/ID/版本，没有当前例句ID。同用户、同句、同选区跨文章/两种例句复用L1。

### examples：父键是lookup_entry_id，不存单词

| id | lookup_entry_id | text | target_ranges |
|---|---|---|---|
| E1 | L1 | Children can be remarkably resilient. | [[27,36]] |
| E2 | L1 | She remained resilient during the crisis. | [[13,22]] |

各行有自己的content_hash、created_at。通过L1取得所有者、lemma、词性和含义，不重复保存这些主数据。L1的例句就是WHERE lookup_entry_id=L1的整组有序行。

### vocabulary_cards：保存完整收藏资料

| id | owner_id | lemma / pos | meaning_key / meaning_zh | context_text | selection_start/end / selected_text |
|---|---|---|---|---|---|
| V1 | U1 | resilient / adjective | M1 / 有韧性的；能恢复的 | The community remained resilient after the storm. | 23 / 32 / resilient |

其他字段：lemma_key=resilient，accepted_forms=["resilient"]，created_at/updated_at为收藏时间。没有current_example_id、版本或lexeme辅助表。lemma是按语境判断的规范词形，不是原文的屈折写法。

### vocabulary_examples：收藏复制的独立例句

| id | vocabulary_card_id | text | target_ranges |
|---|---|---|---|
| VE1 | V1 | Children can be remarkably resilient. | [[27,36]] |
| VE2 | V1 | She remained resilient during the crisis. | [[13,22]] |

各行有content_hash、created_at。这两行文字与E1/E2在收藏当时相同，采用新ID且只关联V1。缓存刷新E2不改VE2；词卡刷新VE1不改E1。删除V1级联删除VE1/VE2，不删除L1/E1/E2。此复制是用户明确要求的独立资料，不是版本历史。

### translation_sets

| card_id（PK） | options | correct_option_id |
|---|---|---|
| V1 | O1:adjective/有韧性的；能恢复的；O2:adjective/暂时的；O3:adjective/易碎的；O4:adjective/遥远的 | O1 |

options为四个{id,pos,meaningZh}结构项的数组，正确项仅服务端保存。通过V1取得用户和词义，无版本、重复词义或独立题组ID。收藏时题组、词卡、整组子例句及三条0轮进度同事务保存，不保留半张词卡。

### review_progress（复习模块，不计入五张文本/词卡核心表）

| owner_id | card_id | mode | round | due_at | last_attempt_at |
|---|---|---|---:|---|---|
| U1 | V1 | speak | 0 | NULL | NULL |
| U1 | V1 | spell | 0 | NULL | NULL |
| U1 | V1 | translate | 0 | NULL | NULL |

没有phase、is_retry、completed_rounds或session。round可以回退，最低0；round=0且有due_at已经开始，不计new。完整逐题写入演绎见[无会话复习示例](stateless-review.md)。

### 页面临时状态与嵌套查词

| 场景 | 页面状态 | 数据库变化 |
|---|---|---|
| 打开L1解释 | exampleIndex=0，显示E1，下方1 / 2 | 无 |
| 手机左滑或电脑点右箭头 | exampleIndex=1，显示E2，下方2 / 2 | 无，不调用AI |
| 打开V1详情/复习 | 独立exampleIndex=0，显示VE1，下方1 / 2 | 无 |
| 复习切到VE2 | 保留作答/选项，显示2 / 2 | 不提交成绩、不改轮次；Speak/Spell全部例句目标在服务端脱敏 |
| 刷新当前E2 | 仍定位当前例句行 | 只替换E2文字/范围及对应音频引用，E1/VE1/VE2不变，失败无改动 |
| 在E1里选remarkably，范围[16,26) | 新开一层解释浮窗，有自己的显示索引 | 新建或复用L2，context_text为该例句全文、lemma=remarkably、pos=adverb；L2的生成例句E3.lookup_entry_id=L2，不自动收藏 |

每个例句的播放/刷新只作用于当前显示行。首/末按钮禁用，不循环；单例句显示1 / 1。手机/平板支持横滑及可访问前/后按钮，电脑左右箭头，键盘可操作。长按选词不翻页，竖滚不翻页，录音期间暂禁切换。嵌套Lookup有独立原句快照，之后刷新来源例句不改既有Lookup。
