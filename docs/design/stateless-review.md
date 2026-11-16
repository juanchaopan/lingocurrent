# 只保存进度的复习与逐步写表示例

- 日期：2026-11-16（America/Toronto）。
- 状态：已确认，随Design定稿。
- 相关：REQ-019、REQ-022、REQ-026–REQ-028、REQ-037；[ADR-0019](../adr/0019-stateless-review-and-round-rollback.md)。

## 数据与流程

复习业务只保存review_progress：owner_id、card_id、mode、round、due_at、last_attempt_at。删除review_sessions/review_session_items/review_prompts/review_attempts；不存phase、短练标记、题面/答案快照、答卷或逐次判定历史。词卡、自己的例句及翻译题组已有数据不因出题复制。

取题读取当前已到期与未开始词，返回一个脱敏题面，不写数据库。提交cardId/mode/answer/operationId，服务端从当前词卡取答案并判定，锁卡及该mode进度、重查可答条件后更新。正确round+1，错误max(0,round−1)且延10分钟。round是可回退进度，不是累计成功数；连续错误可能退多轮。

## 初始数据

示例用户U1、词卡V1=resilient。时间显示本地，存储为UTC：

| owner_id | card_id | mode | round | due_at | last_attempt_at |
|---|---|---|---:|---|---|
| U1 | V1 | speak | 0 | NULL | NULL |
| U1 | V1 | spell | 2 | 11月16日09:00 | 11月14日09:00 |
| U1 | V1 | translate | 0 | NULL | NULL |

## 每一步写什么

| 步骤 | 读取/写入 |
|---|---|
| 10:00点Spell | SELECT该用户Spell进度，先到期再未开始；读取V1及自有例句，返回中文、词性、全部目标隐藏的例句及nextRound=3。没有INSERT或UPDATE |
| 切换第2条例句 | 只改页面显示索引，不写表，不调用AI |
| 10:01答错，提交O1 | 从服务端当前词卡判定；锁(U1,V1,spell)并确认仍可答；UPDATE该行round=1、due_at=11月16日10:11、last_attempt_at=11月16日10:01 |
| 同事务去重 | 复用已有mutation_receipts，将(U1,O1,review_submit)置committed并指向V1；只保存请求摘要/状态/资源引用/期限等通用元数据，不存原答案或判定历史；与进度一起成功或回滚 |
| 响应丢失，O1重试 | 在窗口内查询同receipt，只确认alreadySaved并重读当前进度；不再次判定、减轮或延10分钟，不承诺返回原correct/incorrect |
| 10:11取下一题 | 只读，V1重新满足到期条件；返回当前题面和nextRound=2，没有题目行 |
| 10:12答对，提交O2 | 锁内核对后UPDATE原行round=2、due_at=11月18日10:12、last_attempt_at=11月16日10:12；同事务提交O2通用receipt；Speak/Translate不动 |
| 关闭页面 | 返回原Vocabulary上下文，不写session/题面/作答记录，已保存进度保留 |

一次错后再对得到2→1→2，再等2天。下面是连续错误的另一条分支：

| 提交时间 | 结果 | 同一progress行的新round | due_at |
|---|---|---:|---|
| 11月16日10:01 | 错 | 1 | 当天10:11 |
| 11月16日10:12 | 错 | 0 | 当天10:22 |
| 11月16日10:23 | 错 | 0 | 当天10:33 |
| 11月16日10:34 | 对 | 1 | 11月17日10:34 |

每个提交last_attempt_at=该次提交时间，同步写相应operationId的通用receipt。没有新的复习历史行。最低0，不出现负轮；0轮有due_at已经开始，不计new。新词初始0/NULL，首次错误仍0但due推10分钟，之后正确变1并等1天。round6正确达终点7、due=NULL，三个mode均完成才Archived。

## 重试与并发边界

- 第一份有效提交把due_at推至未来或完成；紧接的另一设备提交锁内发现不可答，409且不改进度。
- 通用去重窗口以24h为可配置初值；同operationId不同请求409。超过窗口不自动重放旧答卷，刷新后显式重新作答；不承诺永久恢复旧题或原判定。
- 若题面期间发生变化，判定以当前词卡为准；Speak判定前后实际答案变更则409重取，不计错。没有旧题快照。
- 原始录音不保存；权限、依赖失败、无效录音、未提交不更新学习进度；未知操作按原operationId核对。
- 删除清词卡、三模式进度、自有例句/题组；独立Lookup保留。通用receipt只做技术去重，不能恢复已删卡或保留原答案。

## 接口与后续验证

GET /review/next?mode=spell只读取题；POST /review/submit接受operationId/cardId/mode/answer。状态查询复用GET /operations/:operationId，关闭无服务端请求。无session、promptId、attemptId、isPractice、题面版本或批次总数。

当前只有规格与假数据预览，无数据库迁移。实现验收包括正确/错误/0轮/终点、当前mode隔离、动态选题、隐藏目标、同operation窗口去重、不同operation并发、未知结果/窗口过期处理和删除竞争。没有声称真实数据库或设备已通过。
