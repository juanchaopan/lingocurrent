# 频道候选交接清单

记录日期：2026-11-16（America/Toronto）。用途：保存已经找到的来源入口和具体 feed，让 R2 从这里继续验证，R1-B 直接使用验证通过、用户选中的配置。**这是候选清单，不是已验证的全文来源或已批准的生产频道**；本次仅核对官方入口，没有抓取三篇样本、执行 RSS spike、导入数据库或启用采集。

## 已定位 feed 的首轮候选

| 配置候选标识 | Source / Channel | Category 草案 | 精确 feed URL | 已知依据 / 后续只补哪些证据 |
| --- | --- | --- | --- | --- |
| nasa-technology | NASA / Technology | Technology | https://www.nasa.gov/technology/feed/ | NASA 官方 RSS 目录的 Technology 链接；未验证正文完整性、文章文本复用/TTS 条件及供给量 |
| nasa-aeronautics | NASA / Aeronautics | Science | https://www.nasa.gov/aeronautics/feed/ | 同一官方目录的 Aeronautics 链接；不从 Technology URL 猜出来；后续验证同上 |
| nasa-news-releases | NASA / News Releases | Science | https://www.nasa.gov/news-release/feed/ | 同一官方目录的 News Releases 链接；后续验证同上，需与其他 NASA 频道检查文章重叠/去重 |
| hackaday-technology | Hackaday / Blog | Technology | https://hackaday.com/blog/feed/ | Hackaday 官方首页页脚 RSS 链接；页面同时声明 https://hackaday.com/feed/ 为 alternate feed，优先用显式页脚地址，不重复建两频道；全文和复用/TTS 条件均待验证 |
| nih-research-matters | NIH / Research Matters | Health | https://www.nih.gov/nih-research-matters/feed.xml | NIH 官方栏目 Connect with Us 的 RSS feed 链接；浏览工具识别为 application/rss+xml，直接脚本读取栏目遇到 HTTP 403，不能把该差异当抓取已通过；全文/供给量/来源条件待 R2 |

证据入口：[NASA 官方 RSS 目录](https://www.nasa.gov/rss-feeds/)、[Hackaday 官方首页](https://hackaday.com/)、[NIH Research Matters](https://www.nih.gov/news-events/nih-research-matters)。本次直接读取 NASA 与 Hackaday 页面 HTML，保存上表公布的地址；没有把 RSS 存在等同于全文可用。来源文本/图标的条件沿用[已有初筛](content-source-research.md)中的逐项核对要求。

## 已知缺口与候补，避免重复搜索

- **Fashion / Style 尚无已核实的独立全文 feed。** Fashionista 官方首页 https://fashionista.com/ 可由浏览工具查看，直接脚本返回 HTTP 403；本次未定位官方 RSS 地址，不将猜测的 `/.rss/full/` 或分类路径写入可导入配置。R2 在这个明确缺口上继续，不用重新调查上表已定位的科技/科学/健康入口，也不能用科技源冒充时尚源。
- NOAA、NSF 保留为[已有科学来源候补](content-source-research.md)，已经保存的官方栏目与使用条件链接直接复用；目前没有验证其精确全文 feed，不优先扩大科学候选数量。
- Yahoo 继续只是设计示例，未批准也未证明可全文接入。若首轮已有来源满足需求，不为凑站点数重复研究 Yahoo 或额外来源。

## R2 → R1-B 的固定交接

1. 先对本表逐项补 RSS 三篇样本与原文完整性、HTML 清理/稳定键/重复文章、使用条件、英语长度难度和实际更新量，结论标为通过、拒绝或证据不足，附检查日期。**只有 URL/内容/条件发生变化，或已知候选都不能满足需求时，才重新发现来源。** 必要的样本实测不算重做来源初筛。
2. 将 Fashion / Style 缺口单独补齐，找不到如实记录并保留待决定项；不能假称全部频道已选好或静默引入 scraping。
3. 用户选择后，输出一份可直接交给 R1-B 导入的 manifest：Source 显示名/图标及取得依据，Channel/category/feed_url、IANA 时区、每个时点篇数、启用状态。时区/时点/篇数当前未确定，不自动套全站四批四篇；未验证候选始终禁用。
4. 复用同一份结果清单和 manifest，R1-B 校验/显示差异/幂等导入，R3 直接实现已选 feed，不再次从零研究。任何取值变化回写本清单及相关 issue，进度仍以 GitHub 为准。
