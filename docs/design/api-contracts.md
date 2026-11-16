# HTTP、AI 与客户端契约

2026-11-16最终确认：用户明确“ok, finalize design”。Design已确认并定稿，最新复习只保留review_progress；删除review_sessions/review_session_items/review_prompts/review_attempts，不设phase或短练标记。答错round减1最低0并延10分钟，答对加1查间隔；逐题实时查询，通用mutation_receipts仅作有期限的请求去重。下方历史记录中的旧表、共享例句或待审状态均不优先于当前data-model/API及Design确认记录。实现、RSS/语音Spike、部署和真机验证尚未执行。

状态：2026-11-16用户已确认，Design定稿。均为目标契约，尚无可调用 API。所有路径前缀 `/api/v1`；JSON；服务端 Zod 校验并由共享 DTO 生成 TypeScript 类型，domain 不导入 HTTP。Route Handler 负责身份/输入输出，application 负责事务，模块端口负责业务。

2026-11-16按用户反馈修订：导航/查询/浮窗/单词音频以[输入方式修订](input-and-density-revision.md)和本文新契约为准。来源RSS调查仅列入后续Roadmap Spike。

## 共同约定

身份界面采用Clerk登录入口；Log out调用真实Clerk退出并清客户端个人状态，跳转登录边界。服务端所有请求继续逐次校验session，退出不撤销已提交学习成绩，也不把本机模拟状态当真实认证。复习逐题更新进度，提交成功后当前题只读，不提供历史作答修改/撤销接口，也不保存逐次作答表。

成功 `{ data, meta?: { nextCursor, serverTime } }`；错误 `{ error: { code, message, retryable, requestId } }`。message 为英文，不能返回栈/密钥/原始模型输出。401 未登录，403 非有效成员，404 不存在或不属于当前用户，409 当前数据/幂等冲突，422 语义输入/选区无效，503 依赖失败，202 仅表示有可追踪的未完成操作，不能显示“已保存”。不是所有失败都自动重试。

客户端传 `operationId` 随机 UUID，服务端绑定 owner、操作类型、规范请求摘要，不能把 id 本身当授权。已完成相同请求返回同一结果引用；相同 ID 不同摘要 409 `OPERATION_MISMATCH`。并发同 ID 返回 202 + 操作查询 URL，不再次生成。`mutation_receipts` 记录 claimed/committed/unknown、租约、结果资源 ID，不复制题面/词卡或形成任务队列；建议 24h 幂等窗口。租约过期必须先核对业务提交，不能直接再调用模型。业务写与 committed receipt 同事务。

刷新/替换/删除只传资源ID及operationId，不传expectedVersion、lookupVersion、contentVersion或改名的版本token。应用服务在短事务锁内重读实际词义、本次目标例句行与资源存在性；生成期间原数据已改变返回409，禁止upsert。响应丢失以receipt核对，超出幂等窗口要求重新读取并显式操作；不盲重放新增收藏。业务幂等不保证外部模型恰好调用一次。复习也复用该有期限的operationId去重，不另建attempt表或承诺永久重放旧判定；窗口过期不自动重放旧答卷。

## 阅读、搜索和队列

| 方法 / 路径 | 输入 | 返回 / 行为 |
|---|---|---|
| GET `/me` | Clerk session | 有效成员与最小 profile，不返回配置秘密 |
| GET `/articles` | q?, sourceIds[]?, categoryKeys[]?, sort=article/category/source/collected/lastVisited, direction, snapshotId?, page/pageSize或cursor/limit | ready文章唯一列表；Source/Category组合筛选，精确totalCount/pageCount，稳定排序；每行lastVisitedAt（未访问NULL） |
| 个人访问查询 | 合入GET `/articles`的lastVisitedAt与排序 | 无独立/history页面或all/history scope；visits仍唯一upsert |
| GET `/articles/:id` | — | 标题/source(id,name,iconUrl)/category/collectedAt、正文句子、时间轴和已有durationMs；不返回持久wordCount |
| PUT `/articles/:id/visit` | operationId | 打开详情后调用；原子 upsert 个人访问，文章不存在不创建；重复请求不复制记录 |
| POST `/playback-queues` | q?, sourceIds[]?, categoryKeys[]?, sort, direction, listSnapshotId?, startArticleId?, returnContext | 冻结完整匹配集及原ordinal；Play all从首篇开始，行播放从startArticleId开始；保存查询/页大小/返回上下文 |
| GET `/playback-queues/:id/items` | afterOrdinal?, limit? | 后续页只读固定集合，返回articleId/listOrdinal及列表定位信息；篇末回列表，页末前进到下一页再进入首篇；不重跑搜索，被删项跳过 |
| POST `/media/playback` | kind=article/example/word，articleId、exampleLocator或lookup/card词头locator | 授权短期地址/已知durationMs；缺例句/词头音频按需生成并复用同一pending_jobs单飞机制；不接受任意用户文本生成 |
| GET `/sources/:id/icon` | 有效成员session | 按checksum缓存的小图标二进制；列表只含iconUrl，不把Base64重复进每条JSON |
| GET `/operations/:operationId` | — | owner 内当前状态、结果资源 ID/错误；无权不透露操作 |

文章搜索建议：长度上限200字符、English plainto_tsquery（词干/AND），只查正文；空白无筛选、纯停用词给空结果提示。搜索不强制改变用户排序。Source内多选OR、Category内多选OR、两者与q之间AND；sort字段白名单，不能插入任意SQL列或表达式。所有参数绑定。

统一列表查询在短事务中创建有序ID快照（list_snapshots/items，建议15分钟）。page/pageSize用于鼠标页码/末页；cursor编码同快照ID/下一个ordinal用于触控；totalCount/pageCount源于同一过滤快照，不能用当前页长度代替。首次结果包含snapshotId/asOf/serverTime；后续只翻快照，不随新文章/新词插队。删除项跳过并返回失效提示/更新有效计数，重新查询再建立干净快照；不自动重建被删资源。用户更改搜索/筛选/排序时清snapshot/page。学习状态可重读最新值，若排序字段变动提示可刷新，旧snapshot的顺序保持稳定。播放队列另冻结完整ID集合，不受浏览快照15分钟到期影响。

私有播放地址建议 10 分钟起步，过期后先重新授权再续签，保持当前时间；不持久记录 URL。首次连续播放须用户手势启动；后台续签/跨文自动播放失败显示 Tap to continue，不声称必然无缝。Range/过期后的请求行为和是否需调整有效期须正常集成/设备实测，设计不改用公开音频。

## 查词与词卡

| 方法 / 路径 | 输入 | 返回 / 不变量 |
|---|---|---|
| POST `/lookups` | operationId, contextLocator, selection UTF-16 range | 缓存命中返回原解释；未命中才 AI；服务端重建上下文，不能信任客户端任意全文 |
| POST `/lookups/:id/examples/:exampleId/refresh` | operationId | 固定meaning，只替换该lookup所属的一条例句；其他例句及词卡不变，不提前生成四项 |
| GET `/vocabulary` | state=all/new/ongoing/archived, q?, rounds.speak[]?, rounds.spell[]?, rounds.translate[]?, sort=word/speakRound/speakNext/spellRound/spellNext/translateRound/translateNext, direction, snapshot/page或cursor | 全部个人词卡；每mode round/nextRound/dueAt（状态派生），组合筛选和全量排序，精确totalCount |
| GET `/vocabulary/:id` | — | 规范词形、词性、中文、例句目标、三个模式的当前进度、收藏原句/选区、有序examples数组；普通查卡接口不当复习题面使用 |
| POST `/vocabulary` | operationId, lookupId | 新收藏；四项全部有效再原子保存卡/题组/三模式round=0且due_at=NULL；重复先 409 `DUPLICATE_WORD` + 需确认的旧卡摘要 |
| POST `/vocabulary/:id/replace` | operationId, lookupId, confirm=true | 服务端重查并确认同一词义，保存中文/例句，保持意义和三模式进度 |
| POST `/vocabulary/:id/examples/:exampleId/refresh` | operationId | 固定词义只替换该词卡所属的一条例句，其他例句/进度不变，题组有效则复用，失败保留旧值 |
| DELETE `/vocabulary/:id` | operationId | 删除全部本卡学习记录，解释缓存保留；同一删除重试确认不存在可返回204 |
| POST `/vocabulary/bulk-delete` | operationId, ids:[id]，1–100个不同ID | 逐项校验owner/存在性，在同一事务删除所选卡及各自题组/复习记录；全部成功后返回deletedIds，不接受q/全库通配删除 |

批删与单删共用Vocabulary删除用例及固定锁顺序，不新增任务/软删除或独立回收站。批删先按稳定ID锁定，再检查所有项；有并发删除或身份/含义不符则整批409 SELECTION_CHANGED、不部分删，客户端刷新所选项并重新确认；无权请求整批拒绝，不泄露其他用户资源信息。相同operationId在既有幂等窗口内重放返回原提交结果；响应丢失先核对operation，不重新造ID。成功后失效所涉词卡/例句/题面/复习队列及counts查询；独立lookup解释缓存保持。选择集只存明确ID，桌面表头选当前页、触控选已加载项；分页保留选择，改变查询条件清选择。正式客户端同样限制100并显示上限，不能静默只删部分。

contextLocator为article(articleId,sentenceIndices)、lookup(lookupId)、lookup-example(lookupId,exampleId)或vocabulary-example(cardId,exampleId)。服务端验证存在、所有权并重建原句。来源仅用于本次授权/读取，不存入lookup，不进入缓存键；缓存自身的context_text也能作为嵌套查词来源。review使用cardId、mode、exampleId及可见片段序号；服务端从当前自有例句重新计算隐藏位置及可见片段，只接受可见片段内选区，不接受客户端自称的公开文本或跨隐藏缺口选区。无prompt ID或持久题面快照。

缓存键包括 owner、完整上下文快照、选区范围；视觉换行不入键。显式refresh沿原key只更新明确子行ID对应的例句，无version；来自文章与例句的相同规范句子和选区直接复用同一lookup_entries。可见片段外查词/跨隐藏缺口统一 422 `HIDDEN_RANGE`，返回中不得附原目标。题面未答时不提供完整例句 media locator，例句播放端口也检查授权上下文。Lookup 的规范词形阶段→当前有效词义集合→最终解释阶段可以多次模型请求；每次独立记录 usage。

## 复习

| 方法 / 路径 | 输入 | 输出 |
|---|---|---|
| GET /review/counts | — | 各mode due/new及totalDue/totalNew（三mode任务数之和）；new=round0且dueAt为空，due=dueAt已到期且未完成；计数不受词库筛选影响 |
| GET /review/next | mode | 实时查询最早到期词，再未开始词；只返回一个脱敏题面，不写任何表；无可答给empty/nextDueAt |
| POST /review/submit | operationId, cardId, mode, answer | 首次提交返回correct/incorrect、可公开答案及新round/dueAt；去重命中返回alreadySaved及当前进度，不重判/重写，不保证原判定重放 |
| GET /operations/:operationId | — | 查询通用操作状态及资源ID，再重读进度；不返回作答历史 |
| 关闭复习页面 | 客户端返回原Vocabulary上下文 | 无关闭session请求；已保存成绩保留、未提交不计错，未知操作保留原operationId核对 |

Speak/Spell题面DTO：{cardId,mode,nextRound,pos,meaningZh,examples:[{id,segments:[{index,text}|{gap:true}]}]}，不含lemma、acceptedForms、完整例句、答案偏移/长度或原音频定位。Translate：{cardId,mode,nextRound,lemma,examples:[{id,segments:[{index,text}]}],options:[{id,pos,meaningZh}]}，不含correctOptionId。不返回promptId、phase、isPractice、题面版本或固定批次总数。

每次下一题实时查询该用户该mode：round未达终点且dueAt≤DB now，或round=0且dueAt=NULL。到期按dueAt/cardId升序，新词按createdAt/cardId升序，无每日额度。新收藏/刚到期可进入下一次查询；词库筛选只影响返回位置，不限制模式按钮的全部due/new。

提交鉴权并以通用operationId领取/核对receipt，检查card/mode当前可答性，从数据库读取当前正确答案；Speak事务外判定，最后短事务锁卡/该mode进度，再查存在性、当前答案与本次判定输入一致性及可答条件。正确round+1查间隔，终点清dueAt；错误round=max(0,round−1)、dueAt=最终事务now+10分钟，last_attempt_at=本次提交时间。进度与receipt committed同事务，失败全部回滚。无效录音/权限/依赖故障不计错。已删卡404，未来到期/已完成409，不允许upsert。

并发不同operationId：先提交者把dueAt推到未来或完成，后提交者锁内复核后拒绝，不能重复加/减轮。同operationId在24h可配置窗口内不重复判定/写入；响应丢失查operation并刷新进度，不把unknown/404视为错误成绩。receipt只存最小操作元数据与结果资源引用，不存原答卷/题面/原判定/进度历史。超过窗口不自动重放，不承诺旧答卷永久去重或冻结旧题。

模式小灰字与关闭X同一行，Round以nextRound放提交区；无Due/This mode/Scheduled/Practice口号，正常单题一屏。Due/—/4 days/3 hours/2 mins/< 1 min只作显示，排序用round/dueAt/serverTime。

词库搜索覆盖lemma/例句英文FTS及词/短语、中文、词性绑定子串。New要求三个mode均round0且dueAt=NULL，Archived三个round均终点，其他Ongoing。每mode轮次多选OR、mode之间AND，与state/q叠加；nextRound=round+1，终点NULL，NULLS LAST及稳定ID并列。

Spell answer为{text}，Translate为{optionId}，Speak为multipart audio加operationId/cardId/mode及受控元数据。录音大小/时长/mime由Speak Spike取证，必须有界上传/超时及真实格式检查；原录音仅请求内暂存，finally清理，不入DB/对象存储/日志。

## 模型与语音端口

| 端口 | 输入 / 输出 / 校验 |
|---|---|
| LemmaNormalizer | selectedText + 完整相关句 → lemma/lemmaKey/pos；只提候选，不修改词库 |
| ContextExplainer | lemma + selectedText + contexts + 有效个人词义(id,pos,中文) → selectedMeaningId 或新含义、中文、examples:[{text,targetRanges}]、acceptedForms |
| FixedMeaningExampleGenerator | 固定 meaning snapshot + pos → 一个新例句及所有目标范围；不得自行换义 |
| TranslationGenerator | 固定词义/词性 + 现有卡 → 四个唯一选项/一个正确；模糊多解拒绝提交 |
| ArticleNarrator | 固定正文/句子/引擎配置 + checkpoint → 完整音频、按句时间轴、实际字节和模型计量 |
| ExampleNarrator | 不可变例句/引擎配置 → 音频与计量，不修改学习文字 |
| WordNarrator | 已授权lookup/card的规范词或短语 + 引擎配置 → 缓存音频/时长/计量；不修改词义/进度，和例句分别缓存 |
| SpeechMatcher | 有效原录音 + 规范目标/可接受形式 + enginePolicy → correct/incorrect/technicalFailure、引擎版本/计量；不向客户端输出未经验证的发音评分 |

模型返回先 Zod 再语义校验：目标切片/屈折形式、规范形式、同词词义引用必须有效，四项唯一且正确项对应本卡；模型无任意工具/SQL/抓取权限。内容当数据，正文里的指令不作为系统指令。严格 schema 不能证明语言判断正确，真实样本验证仍是门槛。

TTS/Speak 端口不写死模型、音色、K 或运行时；由 ADR-0016 后续证据填入。匹配候选分数不是自然发音质量分数。供应商没有 usage 回执则保存 unknown/估算口径，不伪造 token 或成本。

2026-11-16例句归属/切换修订：Lookup返回父行及其examples有序数组；词卡/题面返回词卡自己的vocabulary_examples数组，不返回currentExampleId。手机/平板左右滑动、电脑左右箭头及键盘切换，下方1 / N；索引仅本地，不调用生成接口。Speak/Spell在全部例句里隐藏每处目标，未显示的其他例句也不能在DTO泄露答案；切换不重新发题、不改成绩；刷新后失效客户端题面查询并读取当前词卡，不保存prompt快照。子行权限从各自父行取得。
