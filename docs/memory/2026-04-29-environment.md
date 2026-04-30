2026-04-29: 在 Codex Windows App 内执行 `rg --files` 时，内置 `rg.exe` 从 `C:\Program Files\WindowsApps\...` 启动被拒绝；遇到相同环境可先用 PowerShell `Get-ChildItem` 和 `Select-String` 规避。
2026-04-29: `E:\moneyapp` 当前没有 `.git` 目录，`git status` 会报 `not a git repository`；需要推送时先初始化仓库或切到已 clone 的项目目录。
2026-04-29: Python 3.13 `http.server` 在本机把 `.js` 返回为 `text/plain`，导致浏览器拒绝加载 `type="module"`；本项目改用 `npm run dev` 的零依赖 Node 静态服务保证 MIME 正确。
2026-04-29: Edge headless `--screenshot --window-size=390,...` 在本机截图会裁掉右侧，疑似使用了更宽的内部布局视口；移动端视觉验证可用 440 宽截图粗查，再用真实浏览器或设备确认 390 宽细节。
2026-04-29: `dialog` 内取消按钮如果仍是 submit 且表单里有 `required` 空输入，会被浏览器原生校验拦截；取消/关闭按钮需加 `formnovalidate` 或改成显式关闭逻辑。
2026-04-29: 本机 GitHub CLI 有账号记录但 keyring token 失效，`gh auth status` 提示重新 `gh auth login -h github.com`；需要 GitHub Pages 部署前先由用户完成登录。
2026-04-30: `git push` 会读取全局 Git 代理；本机代理端口改为 `127.0.0.1:10086` 后需同步更新 `http.proxy` 和 `https.proxy`，否则会继续连旧端口导致推送失败。
2026-04-30: Supabase 客户端如果被 `app.js` 静态导入，CDN 或网络异常会拖垮整个离线 PWA；云同步应放到动态 import，在用户操作同步时再加载。
2026-04-30: GitHub secret scanning 可能会提示 Supabase anon/public key；该 key 可用于浏览器但必须配合 RLS，不能提交 service role key，若误报可在确认 RLS 后关闭告警或改用 publishable key。
2026-04-30: 用 Edge CDP 做本地烟测时，`Page.loadEventFired` 是事件不是命令；脚本应订阅事件或导航后短暂等待，否则会报 `'Page.loadEventFired' wasn't found`。
2026-04-30: Edge CDP 的 `Runtime.evaluate` 内如果执行 `location.reload()`，当前 promise 会因执行上下文销毁而失败；烟测应先写 localStorage，再用 `Page.navigate` 单独重载后继续验证。
2026-04-30: PointerEvent 自动化长按不会自动合成后续 click，可能让 `longPressTriggered` 残留并吞掉下一次点击；长按弹窗关闭时应清理该标记，烟测可显式点击验证。
