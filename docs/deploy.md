# Build and Deploy

This site is a VitePress static site deployed to GitHub Pages by GitHub Actions. The target domain is `wiki.mcnb.dev` (`docs/public/CNAME`). The Pages custom domain is already set to `wiki.mcnb.dev`; because the domain's DNS points at Cloudflare rather than GitHub Pages, GitHub's domain check stays errored and `https://wiki.mcnb.dev/` currently serves a stale build through Cloudflare (verified 2026-11-08: live `/sitemap.xml` 404s; `wiki.samuelcheston.com` no longer serves the site). See the deployment section of [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md) for the verified state and the owner decision.

## Continuous Deployment

The workflow `.github/workflows/deploy.yml` runs on every push to `main`:

1. Checkout (full history, needed for `lastUpdated`)
2. Setup Node 24 with the npm cache keyed on `package-lock.json`
3. `npm ci` — fails the run on any dependency problem
4. `npm run docs:build` — a build failure fails the run
5. Verify the dist output exists (`index.html`, `CNAME`)
6. Upload the artifact and deploy it to GitHub Pages

No secrets are required: the deployment uses the built-in `GITHUB_TOKEN` with `pages: write` / `id-token: write` permissions. The repository's Pages setting must use **Source: GitHub Actions** (this is already configured).

## Custom Domain

The custom domain comes from `docs/public/CNAME` (`wiki.mcnb.dev`), which VitePress copies into the build output; GitHub Pages picks it up from the deployed artifact. DNS must point `wiki.mcnb.dev` at the GitHub Pages endpoints (A/AAAA records or a CNAME to `SamuelCheston.github.io`).

Note: the Pages custom domain is set to `wiki.mcnb.dev` (owner decision; it will not be rolled back). Deploys still complete green while GitHub's domain check is errored, but until the DNS/origin question is settled the live site serves the last good build through Cloudflare. Current state and owner decision items are tracked in [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md).

## Manual Build

```bash
npm ci
npm run docs:build
```

Output: `docs/.vitepress/dist`. Preview locally with `npm run docs:preview`.

## Open Items

Tracked in [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md) at the repository root.
