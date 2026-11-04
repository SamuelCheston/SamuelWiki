# TODO / Decision Log

Unattended maintenance pass, 2026-11-05. Items below need a human decision or follow-up.

## Deployment

- [ ] **Domain wiring needs the owner (manual Cloudflare/DNS step).** Verified state on 2026-11-05:
  - The Actions pipeline deploys successfully; the Pages origin serves the current build at `wiki.samuelcheston.com`.
  - The Pages custom domain is set to `wiki.mcnb.dev` (matching `docs/public/CNAME` and `sitemap.hostname`), but GitHub Pages reports `status: errored`: `wiki.mcnb.dev` resolves to Cloudflare (proxied), not to GitHub Pages addresses, so GitHub's domain check fails.
  - `https://wiki.mcnb.dev/` currently serves a **stale** build (last-modified 2026-11-03) from whatever origin Cloudflare is using — not the current Pages deployment.

  Options (pick one; all are owner actions outside this repository):
  1. **Repoint the Cloudflare origin** for `wiki.mcnb.dev` to `SamuelCheston.github.io` (origin rule or CNAME record, proxy can stay on). Impact: smallest change, keeps Cloudflare TLS/CDN; Pages keeps serving the artifact's `CNAME` domain.
  2. **Point DNS at GitHub Pages directly**: set `wiki.mcnb.dev` A records to `185.199.108.153`–`185.199.111.153` (and/or AAAA `2606:50c0:8000::153`–`2606:50c0:8003::153`) and disable the Cloudflare proxy for that name. Impact: GitHub terminates TLS and passes its own domain check, Pages status turns healthy; Cloudflare features are lost for this hostname.
  3. **Fall back to `wiki.samuelcheston.com`**: keep the domain Pages already serves, and only then update `docs/public/CNAME` and `sitemap.hostname` in this repository to match. Impact: abandons `wiki.mcnb.dev` as the canonical domain; every external reference to the wiki URL must follow.

  Ordering rule: **do not change `docs/public/CNAME` or `sitemap.hostname` before the DNS/origin change is done** — the repository files declare the target domain (`wiki.mcnb.dev` stays the target until the owner decides otherwise); changing them early would desynchronize the Pages deployment from the intended domain.
- [ ] Decide whether the legacy `gh-pages` branch (last deploy 2026-08-18) can be deleted once the Actions pipeline has proven itself.
- [ ] `htaccess.example` is an Apache leftover; delete it if no Apache deployment is planned.

## Documentation centralization

- [ ] WinnerProxy pages `api.md` and `deployment.md` still live only in the frozen `CoreMatch/HRPAuth-Wiki` repository; import them into this wiki when their content is refreshed (data-flow and troubleshooting were imported and corrected on 2026-11-05).
- [ ] `CoreMatch/HRPAuth-Wiki` is frozen: only the dead pointer in `HRPAuth/configuration.md` was fixed (it pointed at HA-Contract files that moved to the contract archive). Other frozen pages may still drift; treat this wiki as the only live documentation.

## Upstream drift documented (not fixed) here

- WinnerProxy hasJoined stage 3 (`POST /register` body mismatch) and the batch query double prefix are documented as drift on the WinnerProxy pages; the code fix is tracked in HA-Contract's `docs/dev/WinnerProxy/README.md` and WinnerProxy's knowledge base.
- The HRPAuth-Spigot plugin still sends the retired `manage_token` field on force-bind; harmless (ignored server-side) until the plugin is updated.

## Verification log

- 2026-11-05 scope cleanup re-verified against HRPAuth `main` (`0ccd223`): `register.manage`, `profile.change-name`, `profile.change-name.as-service` were dropped by `7f8791b` (merged `6919a12`), and a second batch (`user.mojang-bind-enable(.as-service)`, `user.mojang-bind-disable.as-service`, `totp.status(.as-service)`, `email-2fa.status(.as-service)`) by `266c65c` (merged `0ccd223`); `services/oauth2_scopes_test.go` (`TestOrphanScopesStayRemoved`) guards all of them against re-introduction. None of these scopes had a consuming endpoint. This wiki does not reference any of them as valid scopes (verified by full-text search); HA-Contract's `docs/dev/HRPAuth/tokens.md` records the removal. An earlier unattended-pass report claiming `register.manage` / `profile.change-name` were still valid was a stale read taken before these commits landed.
