# Neon Object Storage 与 Vercel Blob

核对日期：2026-11-15（America/Toronto）。状态：用户已明确选择 Neon Object Storage 和 Vercel-managed Neon，见 ADR-0007；未创建资源或发起付费操作。下文保留比较及待验证边界。应用计算在 Vercel，音频包含文章与可淘汰的例句缓存。

## Neon 可以存音频

[Neon Object Storage](https://neon.com/docs/storage/overview)是独立的 S3 兼容对象存储，不是将音频塞进 Postgres 二进制字段。它与 Neon 数据库在同一项目下，但有独立存储额度。Vercel 函数使用 S3 客户端上传、鉴权签名及删除，无需启用 Neon Functions，符合现有计算约束。

## 对比

| 项目 | Neon Object Storage | Vercel Blob |
|---|---|---|
| 免费对象容量 | 每项目 5 GB，与 1 GB Postgres 数据空间分开 | 1 GB·月平均占用 |
| 免费出网/下载 | 每项目每月 5 GB 公共出网，与 Postgres 等产品共用 | Blob 下载 10 GB/月，另外涉及 CDN/源站计量，交付路径影响实际消耗 |
| 请求计量 | 当前文档不按对象操作另计费用；有服务限流，不能推导为无限请求 | 简单操作 10,000/月，高级操作 2,000/月；上传/list/复制等影响高级操作 |
| 私有访问 | 私有桶、服务端生成预签名 URL；凭据不发浏览器 | 私有 store，服务端鉴权后签名 URL 或鉴权代理 |
| 播放定位 | GetObject 明确支持 Range 部分读取 | 需按所选分发方式验证 Range/拖动和后台播放 |
| 客户端 | S3 SDK 子集，须核对兼容列表与签名/寻址配置 | @vercel/blob SDK，与 Vercel 集成直接 |
| 预览环境 | 对象随数据库分支继承、分支间修改隔离；项目总量仍需考虑所有分支 | 应用自行按 store/路径及凭据隔离环境 |
| 媒体分发 | S3 端点，区域与真实设备延迟需验证；不假定与 Vercel 全球 CDN 等价 | 平台集成 CDN；具体私有交付成本/缓存行为仍需检查 |
| 生命周期 | S3 lifecycle 配置当前不自动执行，应用必须主动清理 | 也按本项目容量高低水位主动清理，不仅靠过期时间 |

依据：[Neon 计划及出网](https://neon.com/docs/introduction/plans)、[Neon 当前价格](https://neon.com/pricing)、[S3 兼容性](https://neon.com/docs/storage/s3-compatibility)、[Neon 鉴权](https://neon.com/docs/storage/authentication)、[Vercel Blob 计量](https://vercel.com/docs/vercel-blob/usage-and-pricing)、[Vercel 私有存储](https://vercel.com/docs/vercel-blob/private-storage)。

Neon Object Storage 已有 GA 公告；不能继续引用早期“Beta 全部免费”的条款代替当前 Free/付费计划。[官方公告](https://neon.com/blog/neon-backend-is-ga)

## 对本项目的影响

用户现在要求例句音频也缓存。Vercel 的 2,000 次高级操作上限因此可能比存储更早成为瓶颈：参考 480 篇/月各一次最终上传，剩余约 1,520 次，尚未计 list、重试或临时分块。如果每天还有 100 次新例句音频上传，仅其本身就约 3,000 次/月。这是计算示例，不是实测或用户额度。

Neon 对象容量较大，减少重建音频的机会，也满足数据集中管理的偏好；但 5 GB 共享出网是实际限制。按 800 词、150 词/分钟、64 kbit/s 单声道估算，一篇约 2.56 MB：

| 估算，不含例句或其他消耗 | Neon | Vercel Blob |
|---|---|---|
| 名义免费容量可容纳文章音频 | 约 1,953 篇/5 GB | 约 390 篇/1 GB |
| 若全部免费出网用于完整文章下载 | 约 1,953 次/5 GB，实际还需扣数据库等 | 约 3,906 次/10 GB，另核对交付路径计量 |

存得更多不等于免费播放次数更多。按对象容量的 95%/90% 清理不能返还已产生的出网；浏览器复用已下载音频能减少部分重复传输，但不能假定每次播放都零流量。

## 已选择 Neon Object Storage

用户已选择推荐的 Neon Object Storage，并要求音频适度压缩，优先自然、清楚而非高保真。共享出网、区域延迟和实际删除释放仍需验证；具体编码/码率按 TTS spike 试听及 CPU 消耗决定。Vercel Blob 留作比较，不继续作为正在使用的对象存储。

不选把音频写入 Postgres 数据行：那会挤占个人缓存/词卡所需的数据库空间，并增加数据库读写/备份负担。对象存储与元数据仍分开。

## 一致性与淘汰注意事项

- 同在 Neon 不等于 S3 上传参与 SQL 事务。现有“完整上传 → 校验 → 数据库发布/引用 → 删除成功任务”的恢复方案仍保留。
- 删除文章当前音频时，事务内删除文章、访问记录及资产引用，并保留最小资产清理状态，提交后幂等删除对象；例句只清音频/引用、文本留表，下次点击朗读重建。外部删除失败不得恢复文章或删除例句，详见 ADR-0005/0015。
- 对象按首次成功创建时间 FIFO，播放命中不改变淘汰顺序。采用不可变对象，数据库记录对象创建时间和大小；不以文章采集时间或最后访问时间替代。
- Neon DeleteObject 在当前分支中软删除；其他分支可能仍可见同一继承对象。官方没有在以上文档中明确保证每次删除立即按相同字节减少项目总配额，不能只凭当前分支 list 中消失就假定全部空间已释放。验证时核对项目占用、子分支与删除传播，预览分支短期使用后清理。
- Neon 的 branch reset 会重置数据库和对象到父分支当前状态；Postgres restore 对 buckets 的行为不同，文档明确对象不随之回滚。恢复后仍需核对元数据与真实文件。[分支说明](https://neon.com/docs/storage/buckets)
- 缓存条目不存在或播放返回对象已删除时，例句应回到生成路径，不能以缺音频为由删除例句文本、词卡、释义或复习记录。
- 任一服务商出现删除失败、过期签名、限流或无法释放空间，都保留未完成任务/状态并可恢复，不把失败当已腾空；不自动购买容量或扩大个人数据删除范围。

## 集成

私有桶/store 由 Vercel 服务端验证 Clerk 身份与数据归属后发放短期播放链接，浏览器直接读取音频；避免无必要地通过函数转发整个音频，因为那仍计源存储出网并可能增加 Vercel 计算/传输。

Neon S3 凭据、端点和区域按既定 GitHub Secrets/Variables 流程注入 Vercel；数据库 Vercel-native 集成已确认可自动绑定 DB 连接配置，但不假设它也自动生成所有 Object Storage 凭据。不启用 Neon Auth、Functions 或 AI Gateway 来替换已定服务。

供应商已选择；实际集成中仍要验证命中/未命中、私有链接、Range、95%/90% 淘汰、并发生成、元数据恢复及免费额度。当前没有本项目实测结果。
