# First Page Budget Dashboard

## 职责

首屏模块负责展示当月收入按用途分配后的剩余额度、已用比例和各用途预算卡片；点击卡片可快速输入支出金额并扣减余额。

## 优先查看

- `index.html`: 页面结构、设置弹窗、快速记账弹窗和底部导航占位。
- `styles.css`: iOS 竖屏优先的视觉样式、卡片布局、弹窗和底部导航。
- `app.js`: `localStorage` 状态、预算分配计算、设置保存、快速记账扣减与提示。
- `manifest.webmanifest` 和 `sw.js`: PWA 安装信息与基础离线缓存。
- `scripts/dev-server.mjs`: 本地开发静态服务器，负责返回正确 MIME，避免模块脚本被浏览器拒绝加载。

## 状态说明

当前数据只保存在浏览器本地 `localStorage`，默认收入为 10000，默认用途为生活、房租、储蓄；后续如果要接入多月份账本或同步存储，优先从 `app.js` 的 `state` 结构扩展。
