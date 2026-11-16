# R4 · 语境查词、收藏和完整词库

GitHub：[#9](https://github.com/juanchaopan/lingocurrent/issues/9)。依赖 [#8](https://github.com/juanchaopan/lingocurrent/issues/8)。

## 类型与目标

`type:feature`；M1 完整首版。在文章/例句里查词、刷新、收藏并管理词卡，完整交付词库查询/筛选/删除和词头/例句音频，不按界面或前后端另拆 issue。

## 对应需求

REQ-001、REQ-012–021、REQ-028–030、REQ-034–037、REQ-039；ADR-0015/0017/0018/0019 与当前 Design 五表/子例句归属、API/状态机、experience/validation。

## 内部执行顺序

Lookup/vocabulary/题组及 review_progress 必需表/端口 → OpenAI 结构/语义校验与现有 usage → 选区/浮窗/独立缓存 → 原子收藏/固定词义刷新 → 完整 Vocabulary/详情/批删 → 复用 media 的按需词头/例句音频 → staging。此处为收藏/列表实现最小进度初始化、查询与删除端口；R5 实现取题、判定和轮次转换，不预先开放无实现的复习入口。

## 验收标准

- [ ] Given 可见连续文本，When 鼠标点击/跨视觉行或相邻句拖选、触控或辅助选词确认，Then 原始选区/完整上下文有效，未确认不调用 AI；嵌套浮窗每次空白/Escape 只退一层并恢复焦点。
- [ ] Given 当前用户已有规范词的有效词义，When 解释新上下文，Then 向模型提供有效词义，复用相同含义并允许不同词义；目标范围/屈折形式/四项结构与语义校验失败不保存，不用中文同义译名直接当身份。
- [ ] Given 同用户同规范句子同范围，When 从文章或例句再次查词，Then 命中同一持久 Lookup 不再调 AI；不同用户隔离。显式刷新固定含义，失败保留旧值，不自动修改已收藏词卡。
- [ ] Given Lookup 与词卡例句，When 收藏或刷新，Then Lookup examples 与 vocabulary_examples 各归父行，收藏复制整组，刷新仅指定子行，互不覆盖；无共享例句/current_example_id/业务版本/lexeme 辅助表。
- [ ] Given 新收藏/重复同义收藏，When 完整保存，Then 新卡/四个唯一带词性中文选项/一个正确项与初始三模式进度原子就绪；重复先确认，取消无修改，替换保留进度。只有收藏生成选项，换同义例句复用有效选项。
- [ ] Given Vocabulary 查询，When 搜索词/短语/中文/词性/例句、状态过滤或组合轮次/Next 排序，Then 覆盖全量个人词卡，七业务列稳定排序、NULL 明确，All/New/Ongoing/Archived 派生正确；due/new 徽标不受列表过滤影响。
- [ ] Given 鼠标/触控，When 看详情/切例句/返回或多选，Then 分页与连续加载互斥，例句 1/N 不循环、索引仅客户端，箭头/手势/键盘等价，查询/加载量/勾选/滚动/焦点恢复；详情不放删除按钮。
- [ ] Given 词头/例句音频，When 命中、缺失或并发点击，Then 独立缓存、单飞复用 R3 同一临时任务/预留/FIFO，按需即时尝试不等心跳；淘汰只清音频不删文字。打开解释不暂停文章，播放才暂停，结束手动恢复。
- [ ] Given 明确选中 1–100 个词卡 ID，When 确认单删/批删，Then 整批校验所有权/存在性并原子删自有例句/题组/进度，冲突整批回滚；缓存解释保留，迟到生成不复活，新收藏新 ID/全零进度。
- [ ] Given 桌面跨页或触控侧滑/长按，When 选择/删除/滚动，Then 侧滑只露按钮、长按不误进、选择暂停自动加载且仍可手动加载，改查询清选择；失败留选择并按同 operationId 核对，末页修正/计数/焦点正确。

## 组件

lookup/vocabulary、review 最小进度端口、media/usage 复用、application/AI/Drizzle、契约/API、lookup/vocabulary features、client overlay/selection、Storybook/迁移/测试。三模式作答留 R5，但本项已能真实使用查词→收藏→词库。

## 依赖、大小与风险

R3 完成。XL，高风险（SQL、个人数据、AI 回调/删除竞争、媒体基础设施）；当前 head 人工确认。

## 测试要点

CLAUDE.md 自检；真实 Postgres 同义并发收藏/刷新删卡/批删整批回滚、跨用户访问；AI 不合法范围/多正确选项/响应丢失/失败保留旧值，每次 attempt 单独记账；真实手机手柄/辅助选词/滑动仲裁；正常/空/加载/错误/长内容 Storybook、Linux 截图与键盘/读屏。
