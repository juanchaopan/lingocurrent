# ADR-0012 环境隔离、GitHub 配置与手动生产发布

- 状态：已接受
- 日期：2026-11-15
- 相关需求：REQ-002、REQ-028–REQ-032

## 背景

用户明确要求本地、PR 预览、staging、production，各环境共用一个 OpenAI key；静态配置源在 GitHub。Vercel 支出为 0，Hobby 无自定义 staging 环境。

## 候选方案

| 方案 | 优点 | 代价 |
|---|---|---|
| 两个免费 Vercel 项目区分 staging/production | 用户已选，稳定测试环境与生产数据隔离 | 两套绑定/部署配置，仍共用团队额度 |
| 无稳定 staging | 配置少 | 改变原先 staging 验证方式，用户未选 |
| main 合并自动生产 | 发布步骤少 | 人工验证机会少，用户未选 |

## 决策

main 合并通过检查后自动部署 staging；版本标签确定产物，手动触发 production。采用无需付费 Required reviewers 的 workflow_dispatch 路径，不把生产默认 Git 自动部署同时打开形成绕过发布流程的第二条路。

生产/测试独立 Vercel 项目与 Neon 项目，PR 预览从不含生产个人数据的测试种子建立临时分支与对象视图；关闭后清理。生产调度启用，其他环境仅测试窗口启用，避免团队 Schedules/追踪免费额度翻倍消耗。

一个 GitHub OPENAI_API_KEY Secret 供各环境服务端注入，不拆 key；其他身份/数据库/存储凭据按环境隔离。静态公开值用 Variables，服务端秘密用 Secrets，只有公开配置可进入 NEXT_PUBLIC_*。动态 PR 分支连接串属于临时绑定，不提交代码或日志。

密钥只注入可信分支/工作流；外部 PR 不自动获得生产或共享模型密钥。配置变更与环境绑定可追踪；不运行来自未审代码的带秘密 workflow。

回滚先恢复已知版本的应用/配置，再核对后台任务版本和资产。数据库变更采用扩展/迁移/收缩，旧应用需兼容，不能依赖立即删字段。Hobby 快速 rollback 有平台限制，更早版本可按标签重新部署；数据库和已淘汰文件不由应用回滚自动恢复。

## 证据

用户选择；[Vercel 环境](https://vercel.com/docs/deployments/environments)、[回滚](https://vercel.com/docs/cli/rollback)、[GitHub Environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)。未配置仓库/账号/流水线或实际部署。

## 后果

- 好处：可稳定验收，不向预览泄露个人生产数据，发布动作明确。
- 代价：多套配置需核对；Hobby 免费额度和共享 OpenAI 限速仍可能互相影响。
- 重新考虑条件：环境规模或安全/容量要求变化；不自动购买自定义环境或分拆 OpenAI key。
