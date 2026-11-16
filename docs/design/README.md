# LingoCurrent 详细设计

- 状态：**已确认，Design已定稿**。
- 确认日期：2026-11-16（America/Toronto）。
- 确认依据：用户明确“ok, finalize design”，并已要求提交全部文档和mockup源码。
- 记录：[最终确认与交接](finalization.md)。

## 当前规格

| 文档 | 内容 |
|---|---|
| [experience.md](experience.md) | 鼠标紧凑分页表格、触控卡片、导航、阅读、删除、选词与单题复习 |
| [data-model.md](data-model.md) | 当前表、字段、归属、缓存与删除边界 |
| [api-contracts.md](api-contracts.md) | REST、搜索/分页、播放、查词、收藏与逐题提交 |
| [state-machines.md](state-machines.md) | 轮次和到期转换、任务恢复、音频发布/清理及故障 |
| [stateless-review.md](stateless-review.md) | 复习只存进度，每一步读取/更新什么 |
| [data-examples.md](data-examples.md) | 临时采集及Lookup/词卡逐表样例 |
| [validation.md](validation.md) | REQ-001–REQ-039追踪、已做检查与实现验收 |
| [mockups/README.md](mockups/README.md) | 当前及初稿源码、Node检查与预览限制 |

## 已确认的最终规则

- 同一应用及数据按鼠标/手指分别优化；手机单列、平板按输入与宽度适配。鼠标完整分页，触控连续加载，两者互斥。整体紧凑、小字、统一、克制。
- Articles唯一列表，Source/Category列头多选漏斗、指定列排序、最后访问时间；触控整项进入，桌面点标题。Play all/行播放冻结完整顺序，篇末回列表再进下一篇，跨页连续，最终回列表停止。
- Vocabulary含All/New/Ongoing/Archived、全文相关搜索、三个模式各Round/Next平铺与组合轮次过滤。菜单及模式按钮红/黄计数；无Review快捷菜单。桌面勾选后才显示删除；触控左滑露右侧红底删除、长按多选；详情无删除。
- Lookup合并句子/范围与解释，相同用户同句同选区跨来源复用。Lookup和词卡各自拥有多条例句，收藏复制整组；无current_example_id、业务版本或lexeme辅助表。例句一次显示一条，触控横滑/电脑箭头，下方1 / N；切换不写库。
- 复习只保留review_progress，无session、prompt、attempts业务表，也无phase/is_retry。实时查到期及未开始词；答错round减1最低0、due_at延10分钟，答对加1查1/2/4/7/15/30天间隔，终点完成。通用operationId仅在可配置窗口内去重，不存逐次判定历史。
- 发题只返回脱敏题面，答案从服务端当前词卡读取。每次有效提交只改当前mode，锁进度核对当前可答条件；关闭恢复原Vocabulary位置，未提交/技术失败不计错。
- Source/Channel/计划是稳定配置，到点创建临时频道任务及逐篇明细，完成即删除；不保留采集运行历史。词头与例句音频分别缓存，FIFO/95%/90%规则维持；文章当前音频淘汰同步删文章，个人学习文本保留。

## 设计默认值与后续验证

日间隔按经过24小时；频道DST缺失时刻顺延、重复时刻只执行首次；搜索按API中的FTS/子串语义。租约、退避、列表/播放快照有效期、通用去重窗口及播放URL有效期为已采用的可配置工程初值，后续按证据调优。

TTS/Speak的引擎、音色、K、录音边界仍须后续Spike取证；[多话题全文RSS调查](../product/rss-spike-plan.md)只记录，Roadmap建Issue后再执行。来源清单、具体频道配置、真实手机选区/滑动/读屏、后台跨文播放、Clerk及数据库事务和Free资源容量仍需实现验收。Design确认不代表这些已通过。

本次只完成Design及全部源码归档/提交；下一阶段按既定顺序为scaffold/GitHub准备，再roadmap，再执行Spike与正式功能。本次不提前执行这些阶段。旧设计沿革保留在changes/和初稿archive；发生冲突以本目录当前规格及最终确认记录为准。
