# Project Setup And Versioning

## 职责

项目初始化模块负责提供 Git 仓库基础、忽略规则、本地开发服务和验证命令，保证静态 PWA 可以在本机以正确 MIME 运行。

## 优先查看

- `.gitattributes` 和 `.gitignore`: 固定文本行尾为 LF，并忽略系统、编辑器、依赖、构建产物和测试报告。
- `package.json`: `npm run dev` 启动本地服务，`npm run check` 做语法检查。
- `scripts/dev-server.mjs`: 零依赖静态服务，默认监听 `127.0.0.1:5173`。
- `README.md`: 当前开发、部署、验证和版本管理说明。

## 状态说明

仓库已初始化为 `main` 分支，并推送到 `https://github.com/Suxmx/moneyapp.git`；GitHub Pages 从 `main` 分支根目录发布到 `https://suxmx.github.io/moneyapp/`。
