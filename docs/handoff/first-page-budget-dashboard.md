# First Page Budget Dashboard

## 职责

首屏模块负责展示日均已用、剩余日均、三色收入分配条和各用途预算卡片；资金用途分为烟火、恒常、归藏三类，只有烟火类点击后会打开快速记账弹窗并扣减余额，长按烟火卡片可直接调整该用途的已用金额。

## 优先查看

- `index.html`: 页面结构、设置弹窗、快速记账弹窗、已用金额弹窗和底部导航占位。
- `styles.css`: 白底、蓝色、淡绿色为主的 iOS 竖屏样式，包含两行日均指标、分类分组、总览三色条、日常卡片底部进度条、弹窗和底部导航。
- `app.js`: `localStorage` v2 状态、三类资金模型、比例/金额双输入换算、设置保存、空白初始状态、设置页重置、烟火类快速记账扣减与长按调整已用金额；固定/储蓄类点击保持静默。
- `manifest.webmanifest` 和 `sw.js`: PWA 安装信息与基础离线缓存。
- `scripts/dev-server.mjs`: 本地开发静态服务器，负责返回正确 MIME，避免模块脚本被浏览器拒绝加载。

## 状态说明

当前数据只保存在浏览器本地 `localStorage`，新安装默认是空白状态，首屏不会渲染默认卡片或空分类提示；`app.js` 会读取旧版 `moneyapp.budget.v1` 并规范化为 v2 结构。设置页的“恢复初始状态”会在浏览器确认后清空本地预算和记账数据。

总览按 `getMonthlyAverages()` 显示日均已用和剩余日均；总览进度条按恒常（黄色）、归藏（蓝色）、烟火（绿色）顺序展示占收入比例。恒常在展示层直接视为已扣除，归藏视为留存，两者卡片都只展示金额且没有进度条；若后续接入多月份账本或同步存储，优先从 `app.js` 的 `categories`、`getMonthlyAverages()`、`getSummarySegments()`、`openSpentAdjustment()`、`toViewFund()` 和 `saveSettings()` 扩展。
