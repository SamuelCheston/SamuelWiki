# 构建与部署

本站是由 GitHub Actions 部署到 GitHub Pages 的 VitePress 静态站点。目标域名为 `wiki.mcnb.dev`（`docs/public/CNAME`）；Pages 源站当前以 `wiki.samuelcheston.com` 提供服务，自定义域名仍在等待 DNS 接线——所有者决策项见 [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md) 的部署小节。

## 持续部署

工作流 `.github/workflows/deploy.yml` 在每次推送到 `main` 时运行：

1. 检出代码（完整历史，`lastUpdated` 需要）
2. 安装 Node 24，并按 `package-lock.json` 启用 npm 缓存
3. `npm ci`——依赖出现任何问题都会使运行失败
4. `npm run docs:build`——构建失败即运行失败
5. 校验产物存在（`index.html`、`CNAME`）
6. 上传产物并部署到 GitHub Pages

不需要任何密钥：部署使用内置 `GITHUB_TOKEN`，并授予 `pages: write` / `id-token: write` 权限。仓库的 Pages 设置需使用 **Source: GitHub Actions**（当前已配置完成）。

## 自定义域名

自定义域名来自 `docs/public/CNAME`（`wiki.mcnb.dev`），VitePress 会把它复制进构建产物，GitHub Pages 从部署的产物中读取。DNS 需要把 `wiki.mcnb.dev` 指向 GitHub Pages（A/AAAA 记录，或指向 `SamuelCheston.github.io` 的 CNAME）。

注意：Pages 自定义域名暂保持 `wiki.samuelcheston.com`。在 DNS 修复前把它设为 `wiki.mcnb.dev` 会让部署任务卡在 `updating_pages` 直到超时（GitHub 的域名检查对 Cloudflare 代理的 DNS 不通过）。产物中的 `CNAME` 文件仍声明目标域名 `wiki.mcnb.dev`。当前状态与所有者决策项见 [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md)。

## 手动构建

```bash
npm ci
npm run docs:build
```

产物目录：`docs/.vitepress/dist`。本地预览：`npm run docs:preview`。

## 待办事项

见仓库根目录的 [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md)。
