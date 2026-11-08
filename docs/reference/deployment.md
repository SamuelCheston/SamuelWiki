# Deployment

This site is deployed to GitHub Pages by the GitHub Actions workflow `.github/workflows/deploy.yml`, on every push to `main`. The target domain is `wiki.mcnb.dev`; the Pages custom domain is set to it, but its DNS points at Cloudflare, so GitHub's domain check is errored and the live site serves a stale build (verified 2026-11-08); `wiki.samuelcheston.com` no longer serves the site. See [Build and Deploy](/deploy) for the pipeline detail and [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md) for the pending owner decision.

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
