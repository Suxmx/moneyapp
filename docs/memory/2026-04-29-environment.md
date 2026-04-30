2026-04-29: 在 Codex Windows App 内执行 `rg --files` 时，内置 `rg.exe` 从 `C:\Program Files\WindowsApps\...` 启动被拒绝；遇到相同环境可先用 PowerShell `Get-ChildItem` 和 `Select-String` 规避。
2026-04-29: `E:\moneyapp` 当前没有 `.git` 目录，`git status` 会报 `not a git repository`；需要推送时先初始化仓库或切到已 clone 的项目目录。
2026-04-29: Python 3.13 `http.server` 在本机把 `.js` 返回为 `text/plain`，导致浏览器拒绝加载 `type="module"`；本项目改用 `npm run dev` 的零依赖 Node 静态服务保证 MIME 正确。
2026-04-29: Edge headless `--screenshot --window-size=390,...` 在本机截图会裁掉右侧，疑似使用了更宽的内部布局视口；移动端视觉验证可用 440 宽截图粗查，再用真实浏览器或设备确认 390 宽细节。
2026-04-29: `dialog` 内取消按钮如果仍是 submit 且表单里有 `required` 空输入，会被浏览器原生校验拦截；取消/关闭按钮需加 `formnovalidate` 或改成显式关闭逻辑。
2026-04-29: 本机 GitHub CLI 有账号记录但 keyring token 失效，`gh auth status` 提示重新 `gh auth login -h github.com`；需要 GitHub Pages 部署前先由用户完成登录。
2026-04-30: `git push` 会读取全局 Git 代理；本机代理端口改为 `127.0.0.1:10086` 后需同步更新 `http.proxy` 和 `https.proxy`，否则会继续连旧端口导致推送失败。
2026-04-30: Supabase 客户端如果被 `app.js` 静态导入，CDN 或网络异常会拖垮整个离线 PWA；云同步应放到动态 import，在用户操作同步时再加载。
