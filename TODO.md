# TODO / Decision Log

Unattended maintenance pass, 2026-11-05. Items below need a human decision or follow-up.

## Deployment

- [ ] **Domain wiring needs the owner.** Verified 2026-11-05: the Actions pipeline deploys successfully and the new site is served by GitHub Pages at `wiki.samuelcheston.com`. The Pages custom domain was set to `wiki.mcnb.dev` (via API, matching `docs/public/CNAME`), but Pages reports `status: errored` because `wiki.mcnb.dev` resolves to Cloudflare (proxied) instead of GitHub Pages addresses. `https://wiki.mcnb.dev/` still serves a stale build (last-modified 2026-11-03) from whatever origin Cloudflare currently uses. Decide one of: (a) point the Cloudflare origin/CNAME for `wiki.mcnb.dev` at `SamuelCheston.github.io` (or set the DNS records to GitHub Pages' A/AAAA addresses and disable the proxy), or (b) revert the Pages custom domain to `wiki.samuelcheston.com` and update `docs/public/CNAME` + `sitemap.hostname` accordingly.
- [ ] Decide whether the legacy `gh-pages` branch (last deploy 2026-08-18) can be deleted once the Actions pipeline has proven itself.
- [ ] `htaccess.example` is an Apache leftover; delete it if no Apache deployment is planned.

## Documentation centralization

- [ ] WinnerProxy pages `api.md` and `deployment.md` still live only in the frozen `CoreMatch/HRPAuth-Wiki` repository; import them into this wiki when their content is refreshed (data-flow and troubleshooting were imported and corrected on 2026-11-05).
- [ ] `CoreMatch/HRPAuth-Wiki` is frozen: only the dead pointer in `HRPAuth/configuration.md` was fixed (it pointed at HA-Contract files that moved to the contract archive). Other frozen pages may still drift; treat this wiki as the only live documentation.

## Upstream drift documented (not fixed) here

- WinnerProxy hasJoined stage 3 (`POST /register` body mismatch) and the batch query double prefix are documented as drift on the WinnerProxy pages; the code fix is tracked in HA-Contract's `docs/dev/WinnerProxy/README.md` and WinnerProxy's knowledge base.
- The HRPAuth-Spigot plugin still sends the retired `manage_token` field on force-bind; harmless (ignored server-side) until the plugin is updated.
