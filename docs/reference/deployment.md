# Deployment

This site is deployed to GitHub Pages at `https://wiki.mcnb.dev/` by the GitHub Actions workflow `.github/workflows/deploy.yml`, on every push to `main`. See [Build and Deploy](/deploy) for the pipeline detail.

## Build Command

```bash
npm ci
npm run docs:build
```

The output directory is:

```text
docs/.vitepress/dist
```

## How the Publishing Works

- GitHub Pages source is set to **GitHub Actions**; the workflow uploads the dist directory and deploys it
- The custom domain comes from `docs/public/CNAME` (`wiki.mcnb.dev`), copied into the output by VitePress
- `sitemap.hostname` is set to `https://wiki.mcnb.dev`, so no `base` path configuration is needed

## Pre-Deployment Checks

1. Run a local build
2. Check that page links and navigation work
3. Confirm the `CNAME` file still matches the intended domain
