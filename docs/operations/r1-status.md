# R1 环境搭建记录与额外代码位置

日期：2026-11-16（America/Toronto）；关联 [#6](https://github.com/juanchaopan/lingocurrent/issues/6)。环境资源已准备，不代表应用已部署或 R1 全部验收完成。

## 我多做了

**我多做了。** 用户本次要先完成账号和运行环境搭建，我还写了 11 张业务表的迁移、登录接入、文章列表和正文页面、访问记录、私有音频接口及配置导入工具。我没有在开始写这些代码前，把它们与用户理解的环境搭建范围核对清楚。

这些额外代码全部已经提交并推送到 GitHub，保留在自己的分支中，不通过本次环境记录 PR 合并进 main：

- 分支：[codex/6-environment-reading-skeleton](https://github.com/juanchaopan/lingocurrent/tree/codex/6-environment-reading-skeleton)。
- 草稿 [PR #12](https://github.com/juanchaopan/lingocurrent/pull/12)，保持未合并，不启用自动合并。
- [3b503d5](https://github.com/juanchaopan/lingocurrent/commit/3b503d5)：表、接口、基础页面、初始化工具与测试。
- [0a9e182](https://github.com/juanchaopan/lingocurrent/commit/0a9e182)：文章刷新与访问路径修复。
- [1d7245a](https://github.com/juanchaopan/lingocurrent/commit/1d7245a)：该分支的环境与验证记录。

建表脚本仅在可丢弃的测试数据库运行过，临时 Neon 测试分支已删除；长期 staging 和 production 数据库均未执行这些迁移。额外代码没有部署到两个 Vercel 项目。草稿分支中的运行命令和截图不代表 main 已具备这些功能。

后续开发时对照 #8 的正式范围重新审查和接续；#9、#10 按各自 issue 开发。代码已在 GitHub 不等于已获准合并到 main，也不等于功能验收完成。本次只合并环境事实和交接说明，不修改业务需求、架构设计或后续 issue 的范围。

## 已准备的环境

| 项目                                    | staging                                 | production                                |
| --------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Vercel                                  | lingocurrent-staging                    | lingocurrent-production                   |
| Neon（自己的账号，经 Marketplace 连接） | lingocurrent-staging-db                 | lingocurrent-production-db                |
| Neon 区域                               | AWS Ohio / us-east-2                    | AWS Ohio / us-east-2                      |
| 私有 bucket                             | lingocurrent-staging-audio              | lingocurrent-production-audio             |
| Clerk                                   | lingocurrent-staging-auth / Development | lingocurrent-production-auth / Production |
| Clerk 凭据类型                          | pk_test / sk_test                       | pk_live / sk_live                         |

- 两个 Vercel 项目均已断开 Git 自动部署；现有部署 workflow 已在 main，不在本次 PR 重写。
- GitHub 已建立 staging、production 两个环境，所需配置名称已核对齐全。名称齐全不代替运行验证。
- 仓库变量：`DEPLOY_ENABLED=true`、`PREVIEW_ENABLED=false`。用户暂不创建或启用 preview。
- `OPENAI_API_KEY`、`VERCEL_TOKEN` 按用户选择各保存一份 Repository Secret；Clerk、数据库和存储凭据按 GitHub Environment 隔离。密钥值不进入仓库、文档或聊天。
- 域名 `lingocurrent.dpdns.org` 在 DigitalPlat 注册，由 Cloudflare Free 托管 DNS；nameservers 为 `camilo.ns.cloudflare.com`、`demi.ns.cloudflare.com`。根域指向 Vercel，Clerk 相关记录使用 DNS only。域名显示到期日为 2027-11-16，需按免费窗口续期。
- 两个 Clerk 实例均配置邀请制及 Google 登录。用户选择共用一个 Google OAuth Client；两个 Clerk 用户池仍独立。Google 要求测试/生产使用独立项目的政策已告知，用户选择保留共用配置，属于已知偏离。LingoCurrent GCP billing 已由用户关闭。
- 本阶段没有调用收费模型、购买域名或升级服务。

## 已验证与未完成

已验证：用户确认 staging 的邀请、接受与 Google 登录成功；staging 私有存储完成上传、签名 URL Range 206、匿名拒绝及测试对象清理。Clerk CLI 聚合查询确认 production 已有 Google 关联用户和登录记录。

尚未完成：

1. 两个 Vercel 项目尚未部署应用，production 登录跳转后的 `404 DEPLOYMENT_NOT_FOUND` 不能作为 Clerk 认证失败的证据。
2. production 邀请邮件被 Gmail `550 5.7.1 likely unsolicited mail` 拒收，添加 DMARC 后仍失败。不能断言域名层级是原因；用户选择暂时保留当前域名。
3. 真实 staging 应用部署及受邀用户打开、保存、刷新、播放的验收尚未执行。后者需要业务代码按后续开发范围审查交付，不能用 health 200 或草稿分支测试替代。
4. preview 创建和清理按用户选择暂缓；Claude 自动代码/安全审查认证也暂缓，不能记作审查已通过。

本次文档合并后，main 仍为已有 scaffold，不会引入草稿分支的业务表、接口和页面。main 的成功 push CI 可触发现有 staging 部署；生产仍只接受经过 main CI 验证的版本标签并手动发布。#6 保持打开，待实际环境验收和范围核对完成后再判断是否关闭。
