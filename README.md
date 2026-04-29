# MoneyApp

自用 iOS PWA 记账应用。当前首屏用于按用途展示当月收入分配、剩余额度和使用比例，并支持点击用途快速记一笔支出。

## 开发

```powershell
npm run dev
```

默认地址为 `http://127.0.0.1:5173/`。本项目暂时不依赖第三方包，开发服务器使用 Node 内置模块实现。

## 验证

```powershell
npm run check
```

该命令会检查前端脚本、Service Worker 和本地静态服务器脚本的语法。

## 版本管理

仓库分支为 `main`。提交前先运行受影响范围的验证；当前没有配置远程仓库，需要接入 GitHub 或其他远程时再执行 `git remote add origin <url>`。
