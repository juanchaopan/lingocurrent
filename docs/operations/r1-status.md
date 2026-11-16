# R1-A 环境与连通记录

日期：2026-11-16（America/Toronto）；关联 #6。本文件记录实际结果，不代表 R1 已完成。

## 实际资源

| 项目                                    | staging                                 | production                                |
| --------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Vercel                                  | lingocurrent-staging                    | lingocurrent-production                   |
| Neon（自己的账号，经 Marketplace 连接） | lingocurrent-staging-db；AWS Ohio       | lingocurrent-production-db；AWS Ohio      |
| 私有 bucket                             | lingocurrent-staging-audio              | lingocurrent-production-audio             |
| Clerk                                   | lingocurrent-staging-auth / Development | lingocurrent-production-auth / Production |
| Clerk 凭据                              | pk_test / sk_test                       | pk_live / sk_live                         |

两项目均已断开 Vercel Git 自动部署。GitHub staging、production 的必需配置名称已核对齐全；名称存在不代替运行验收。`OPENAI_API_KEY`、`VERCEL_TOKEN` 按用户选择各保存一份 Repository Secret，其余应用凭据按环境隔离。仓库开关为 `DEPLOY_ENABLED=true`、`PREVIEW_ENABLED=false`。用户暂不创建/启用 preview；其创建和清理验收仍有缺口。Claude 审查认证也按用户要求暂缓，不能记作审查已通过。

域名 `lingocurrent.dpdns.org` 在 DigitalPlat 注册，Cloudflare Free 托管 DNS；nameservers 为 camilo.ns.cloudflare.com、demi.ns.cloudflare.com。根域指向 Vercel，Clerk 及邮件 CNAME 均 DNS only；DMARC 为 `v=DMARC1; p=none`。DigitalPlat 显示到期日 2027-11-16，需按免费窗口续期。

用户选择共用一个 Google OAuth Client ID，两个回调已登记；Clerk 用户池仍独立。Google 要求测试/生产使用不同项目的政策已告知，用户选择保留当前配置，属于已知偏离。LingoCurrent GCP billing 已由用户关闭。本阶段没有调用收费模型或购买服务。

## 证据与缺口

- 用户确认 staging 邀请、接受、Google 登录成功。
- Clerk CLI 聚合查询：production 有 1 个用户、1 个 Google 关联及 1 个已有登录记录。登录后根域 404 来自没有 deployment 的 Vercel 项目。
- staging 私有存储已验证上传、签名 URL Range 206、匿名拒绝及测试对象删除。
- staging 项目下的 schema-only 临时 Neon 分支运行真实迁移/事务测试：预览不写入、幂等导入保留 ID、冲突整批回滚、并发同 operationId 只有一行访问/回执、用户隔离、成员撤销、文章删除保留成员。长期 staging/production DB 尚未迁移。
- production 邀请邮件被 Gmail `550 5.7.1 likely unsolicited mail` 拒收；添加 DMARC 后仍失败。DNS 记录可解析不能证明实际邮件认证全部通过，也不能证明域名层级就是原因。用户选择暂时保留域名。

合并 R1-A PR 后，由 main CI 自动部署 staging，再从 main 运行 `workspace-admin` 导入 fixture、给已接受邀请的 Clerk user ID 授权，然后验证站点打开、刷新和播放。生产保留手动标签发布。真实 staging、preview 生命周期与 R2 来源选择仍待验收，#6 保持打开。

## 受控操作

文章使用独立 `/articles/<UUID>` 路由；刷新会重新鉴权并更新同一用户/文章的最后访问时间，保存重试复用 operationId。身份/会话切换会销毁旧 QueryClient，退出会停止当前音频并清理个人缓存。

凭据只放 gitignore 的 `.env.local` 或 GitHub Environment；Actions `workspace-admin` 仅允许 main。本地命令：

```sh
node --env-file=.env.local scripts/migrate.mjs
pnpm workspace:admin channels fixtures/channels.json
pnpm workspace:admin channels fixtures/channels.json --apply
pnpm workspace:admin fixture
pnpm workspace:admin grant user_FROM_CLERK
pnpm workspace:admin revoke user_FROM_CLERK
```

fixture 需要 `WORKSPACE_ENV=local` 或 `staging`，使用自有句子和预制 Windows 本地语音 WAV，不代表已选正式 TTS。grant 用该环境 Clerk Secret 验证 user ID 存在；revoke 立即阻止后续 API，不删除数据，不撤销已发出的短期签名音频 URL。

频道命令默认只展示现有和请求配置，`--apply` 才事务写入。Source 名、feed URL、schedule 时间为稳定键；feed 不可跨 Source 转移。未列出的来源/频道保留，列出的频道替换其 schedule 集合。图标校验 Base64、文件头、MIME、64 KiB 上限。所有 schedule 保持禁用到 R3。

`pnpm test:database` 必须使用新建的可丢弃 DB，设置 `TEST_DATABASE_URL`、`TEST_DATABASE_IS_DISPOSABLE=true`。测试会迁移并创建虚构成员，不可用于长期 staging/production。CI 使用独立 PostgreSQL service，不需要云凭据。
