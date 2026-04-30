# First Page Budget Dashboard

## 职责

首屏模块负责展示当日已用、当月已用、剩余日均、三色收入分配条和各用途预算卡片；资金用途分为烟火、恒常、归藏三类，只有烟火类点击后会打开快速记账弹窗并扣减余额，长按烟火卡片可直接调整该用途的已用金额。底部第二个 tab 展示支出明细，第三个 tab 是预算设置页。

## 优先查看

- `index.html`: 页面结构、支出明细视图、底部 tab 设置页、快速记账弹窗、明细编辑弹窗、已用金额弹窗和底部导航。
- `styles.css`: 白底、蓝色、淡绿色为主的 iOS 竖屏样式，包含总览指标、分类分组、总览三色条、日常卡片底部进度条、支出明细、设置页、弹窗和底部导航。
- `app.js`: `localStorage` v2 状态、三类资金模型、支出类别元数据、明细长按编辑、比例/金额双输入换算、设置保存、未分配份额自动结余、空白初始状态、设置页重置、烟火类快速记账扣减与长按调整已用金额；固定/储蓄类点击保持静默。
- `manifest.webmanifest` 和 `sw.js`: PWA 安装信息与基础离线缓存。
- `scripts/dev-server.mjs`: 本地开发静态服务器，负责返回正确 MIME，避免模块脚本被浏览器拒绝加载。

## 状态说明

当前数据只保存在浏览器本地 `localStorage`，新安装默认是空白状态，首屏不会渲染默认卡片或空分类提示；`app.js` 会读取旧版 `moneyapp.budget.v1` 并规范化为 v2 结构。设置页的“恢复初始状态”会在浏览器确认后清空本地预算和记账数据。

总览显示当日已用、当月已用和剩余日均，并在剩余日均下方显示剩余天数；当日已用来自当天明细影响额，当月已用来自烟火类当前已用金额。明细 `kind` 分为 `expense` 和 `adjustment`，普通快速记账为 expense，长按资金卡片调整已用会生成 adjustment，并用轻微黄色底色区分；长按明细可修改金额和图标，保存时按新旧金额差同步该资金用途的已用金额。总览进度条按恒常（黄色）、归藏（蓝色）、烟火（绿色）顺序展示占收入比例。设置保存时若用户分配金额小于收入，会自动生成 id 为 `auto-surplus` 的归藏/结余模块；若超过收入则阻止保存。恒常在展示层直接视为已扣除，归藏视为留存，两者卡片都只展示金额且没有进度条；若后续接入多月份账本或同步存储，优先从 `app.js` 的 `categories`、`expenseCategories`、`createSurplusFund()`、`getTodaySpent()`、`getMonthlyAverages()`、`getSummarySegments()`、`renderDetailsView()`、`openHistoryEdit()`、`openSpentAdjustment()`、`toViewFund()` 和 `saveSettings()` 扩展。
