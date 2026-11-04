# 部署说明

本站由 GitHub Actions 工作流 `.github/workflows/deploy.yml` 在每次推送到 `main` 时部署到 GitHub Pages，地址为 `https://wiki.mcnb.dev/`。流水线细节见[构建与部署](/zh/deploy)。

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
