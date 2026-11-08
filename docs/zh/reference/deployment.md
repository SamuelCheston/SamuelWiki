# 部署说明

本站由 GitHub Actions 工作流 `.github/workflows/deploy.yml` 在每次推送到 `main` 时部署到 GitHub Pages。目标域名为 `wiki.mcnb.dev`；Pages 自定义域名已设为该域名，但其 DNS 指向 Cloudflare，GitHub 域名检查 errored，线上当前提供的是过期构建（2026-11-08 复核）；`wiki.samuelcheston.com` 已不再提供本站。流水线细节见[构建与部署](/zh/deploy)，待决事项见 [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md)。

## 构建命令

```bash
npm ci
npm run docs:build
```

产物目录为：

```text
docs/.vitepress/dist
```

## 发布方式

- GitHub Pages 的构建来源已设为 **GitHub Actions**，工作流上传产物目录并完成部署
- 自定义域名来自 `docs/public/CNAME`（`wiki.mcnb.dev`），由 VitePress 复制进产物
- `sitemap.hostname` 已设为 `https://wiki.mcnb.dev`，无需配置 `base` 路径

## 部署前检查

1. 本地执行一次构建
2. 检查页面链接和导航是否正常
3. 确认 `CNAME` 文件与目标域名一致
