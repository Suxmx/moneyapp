# MoneyApp

自用 iOS PWA 记账应用。当前首屏用于按用途展示当月收入分配、剩余额度和使用比例，并支持点击用途快速记一笔支出。

## 开发

```powershell
npm run dev
```

默认地址为 `http://127.0.0.1:5173/`。本项目暂时不依赖第三方包，开发服务器使用 Node 内置模块实现。

## 部署

GitHub Pages 地址：

```text
https://suxmx.github.io/moneyapp/
```

在 iPhone Safari 打开该地址后，通过分享菜单选择“添加到主屏幕”即可作为 PWA 使用。

## 验证

```powershell
npm run check
```

该命令会检查前端脚本、Service Worker 和本地静态服务器脚本的语法。

## 版本管理

仓库分支为 `main`，远程仓库为 `https://github.com/Suxmx/moneyapp.git`。提交前先运行受影响范围的验证；验证通过后推送 `main`，GitHub Pages 会从仓库根目录发布。
