# Design定稿及复习最终精简

- 日期：2026-11-16（America/Toronto）。
- 级别：L2 / D2，当前只有文档和交互假数据稿，没有应用迁移。
- 来源：用户同意取消prompt/attempts，并明确“ok, finalize design”；此前已要求将全部文档和mockup源码一起commit。

最终只保留review_progress作为复习业务数据。题面从词卡直接生成并返回，不存题目/答案快照；提交读取服务端当前答案并更新round/due_at。请求防重复用已有mutation_receipts的有限窗口，不创建复习专用作答历史，也不把原判定搬进通用表。错误减轮最低0并延10分钟，正确加轮查间隔，终点清due。

同步数据、API、状态机、逐步示例、需求/来源记录、架构和ADR-0019、验证及交付状态。当前和初版mockup源码均已在仓库，Node检查使用本地源码；聊天副本只是镜像。历史记录中已撤回的四表共享例句、业务版本、session和prompt/attempts方案不作为实现基线。

用户最终确认完成Design审阅条件，记录见[确认与交接](../design/finalization.md)。只执行定稿与完整本地提交，没有创建Issue/PR、RSS调查、语音探针、scaffold或部署。数据库/浏览器/真机验收留后续实现阶段。
