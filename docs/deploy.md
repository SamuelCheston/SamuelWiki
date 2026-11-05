# Build and Deploy

This site is a VitePress static site deployed to GitHub Pages by GitHub Actions. The target domain is `wiki.mcnb.dev` (`docs/public/CNAME`); the Pages origin currently serves `wiki.samuelcheston.com`, and the custom domain is pending DNS wiring — see the deployment section of [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md) for the owner decision.

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

Note: the Pages custom domain stays `wiki.samuelcheston.com` for now. Setting it to `wiki.mcnb.dev` before the DNS fix makes the deploy job stall in `updating_pages` until timeout (GitHub's domain check fails against Cloudflare-proxied DNS). The `CNAME` file in the artifact keeps declaring the target domain `wiki.mcnb.dev`. Current state and owner decision items are tracked in [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md).

## Manual Build

```bash
npm ci
npm run docs:build
```

Output: `docs/.vitepress/dist`. Preview locally with `npm run docs:preview`.

## Open Items

Tracked in [TODO.md](https://github.com/SamuelCheston/SamuelWiki/blob/main/TODO.md) at the repository root.
