# First Page Budget Dashboard

## 职责

首屏模块负责展示当日已用、当月已用、剩余日均、三色收入分配条和各用途预算卡片；资金用途分为烟火、恒常、归藏三类，只有烟火类点击后会打开快速记账弹窗并扣减余额，长按烟火卡片可直接调整该用途的已用金额。底部第二个 tab 展示支出明细，第三个 tab 是云端同步页，第四个 tab 是预算设置页。

## 优先查看

- `index.html`: 页面结构、可展开总览卡片、支出明细视图、云端同步视图、底部 tab 设置页、快速记账弹窗、明细编辑/删除弹窗、已用/日限金额弹窗和底部导航；viewport 禁止 iOS PWA 双指缩放。
- `styles.css`: 白底、蓝色、淡绿色为主的 iOS 竖屏样式，包含折叠总览、分类分组、总览三色条、日常卡片底部进度条、约三分之一宽的日限小进度条、支出明细周期分段、带箭头状态的聚合明细、设置页、弹窗和底部导航。
- `app.js`: `localStorage` v2 状态、三类资金模型、支出类别元数据、明细日/周/月分段展示、按资金用途聚合展开、明细长按编辑/删除、比例/金额双输入换算、每日限额设置与长按调整、日限弹窗内切换调整已用金额、设置保存、未分配份额自动结余、空白初始状态、设置页重置、烟火类快速记账扣减；固定/储蓄类点击保持静默。
- `docs/handoff/supabase-cloud-sync.md`: 云端同步的配置、数据流和 Supabase SQL 入口。
- `manifest.webmanifest` 和 `sw.js`: PWA 安装信息与基础离线缓存。
- `scripts/dev-server.mjs`: 本地开发静态服务器，负责返回正确 MIME，避免模块脚本被浏览器拒绝加载。

## 状态说明

当前数据只保存在浏览器本地 `localStorage`，新安装默认是空白状态，首屏不会渲染默认卡片或空分类提示；`app.js` 会读取旧版 `moneyapp.budget.v1` 并规范化为 v2 结构。设置页的“恢复初始状态”会在浏览器确认后清空本地预算、记账数据和明细显示设置。

总览只在预算页显示，明细、云端和设置页都隐藏总览；默认只显示当日已用，点击后展开当月已用、剩余日均和三色分配条。当日已用来自当天明细影响额，当月已用来自烟火类当前已用金额。明细 `kind` 分为 `expense` 和 `adjustment`，普通快速记账为 expense，长按资金卡片调整已用会生成 adjustment，并用轻微黄色底色区分；长按明细可修改金额和图标，也可删除明细，删除时会按该明细金额反向同步资金用途的已用金额。明细页顶部的日/周/月切换控制分段粒度，会显示全部历史并按对应日期、周或月份分隔；设置页的“明细聚合”会在每个分段内按资金用途合并，聚合卡片右侧箭头用于提示折叠状态，点击后展开子明细。总览进度条按恒常（黄色）、归藏（蓝色）、烟火（绿色）顺序展示占收入比例。设置保存时若用户分配金额小于收入，会自动生成 id 为 `auto-surplus` 的归藏/结余模块；若超过收入则阻止保存。烟火类可开启每日限额，开启后卡片大金额显示今日剩余额度，并在其下显示约三分之一宽的日限小进度条，长按该卡片先调整每日限额，也可在同一弹窗切换到调整已用金额；未开启日限的烟火卡片长按仍调整已用金额。恒常在展示层直接视为已扣除，归藏视为留存，两者卡片都只展示金额且没有进度条；若后续接入多月份账本或同步存储，优先从 `app.js` 的 `categories`、`expenseCategories`、`detailPeriods`、`createSurplusFund()`、`getTodaySpent()`、`getTodaySpentByFund()`、`getMonthlyAverages()`、`getSummarySegments()`、`renderDetailsView()`、`getHistoryPeriodSections()`、`groupHistoryItems()`、`openHistoryEdit()`、`deleteHistoryItem()`、`openSpentAdjustment()`、`openDailyLimitAdjustment()`、`toViewFund()` 和 `saveSettings()` 扩展。
