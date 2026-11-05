# TODO / Decision Log

Unattended maintenance pass, 2026-11-05. Items below need a human decision or follow-up.

## Deployment

- [ ] **Domain wiring needs the owner (manual Cloudflare/DNS step).** Verified state on 2026-11-05:
  - The Actions pipeline deploys successfully; the Pages origin serves the current build at `wiki.samuelcheston.com`.
  - `docs/public/CNAME` and `sitemap.hostname` keep `wiki.mcnb.dev` as the target domain (unchanged on purpose).
  - Setting the Pages custom domain to `wiki.mcnb.dev` makes GitHub Pages stall in `updating_pages` until the deploy times out (its DNS check fails because `wiki.mcnb.dev` resolves to Cloudflare, not GitHub Pages). The Pages domain setting was therefore reverted to `wiki.samuelcheston.com` to keep the pipeline green; set it back to `wiki.mcnb.dev` only after the DNS/origin fix below.
  - `https://wiki.mcnb.dev/` currently serves a **stale** build (last-modified 2026-11-03) from whatever origin Cloudflare is using — not the current Pages deployment.

  Options (pick one; all are owner actions outside this repository):
  1. **Repoint the Cloudflare origin** for `wiki.mcnb.dev` to `SamuelCheston.github.io` (origin rule or CNAME record, proxy can stay on). Impact: smallest change, keeps Cloudflare TLS/CDN; Pages keeps serving the artifact's `CNAME` domain.
  2. **Point DNS at GitHub Pages directly**: set `wiki.mcnb.dev` A records to `185.199.108.153`–`185.199.111.153` (and/or AAAA `2606:50c0:8000::153`–`2606:50c0:8003::153`) and disable the Cloudflare proxy for that name. Impact: GitHub terminates TLS and passes its own domain check, Pages status turns healthy; Cloudflare features are lost for this hostname.
  3. **Fall back to `wiki.samuelcheston.com`**: keep the domain Pages already serves, and only then update `docs/public/CNAME` and `sitemap.hostname` in this repository to match. Impact: abandons `wiki.mcnb.dev` as the canonical domain; every external reference to the wiki URL must follow.

  Ordering rule: **do not change `docs/public/CNAME` or `sitemap.hostname` before the DNS/origin change is done** — the repository files declare the target domain (`wiki.mcnb.dev` stays the target until the owner decides otherwise); changing them early would desynchronize the Pages deployment from the intended domain. Likewise, do not set the Pages custom domain to `wiki.mcnb.dev` before the DNS fix — it stalls the deploy job (observed 2026-11-05, run 41891459432).
- [ ] Decide whether the legacy `gh-pages` branch (last deploy 2026-08-18) can be deleted once the Actions pipeline has proven itself.
- [ ] `htaccess.example` is an Apache leftover; delete it if no Apache deployment is planned.

## Documentation centralization

- [x] WinnerProxy `data-flow.md` and `troubleshooting.md` imported and corrected (2026-11-05, round 1).
- [x] WinnerProxy `api.md` and `deployment.md` rewritten against the current code/contract and imported with sidebar entries (2026-11-05, round 3); HRPAuth `operations.md` salvageable remainder (account deletion/restoration flow) merged into `projects/hrpauth/architecture`.
- [ ] `CoreMatch/HRPAuth-Wiki` stays frozen; its content is superseded as follows (page-by-page verdict, 2026-11-05):

  | Frozen page | Verdict | Reason |
  |---|---|---|
  | `WinnerProxy/api.md`, `WinnerProxy/deployment.md` | migrated (rewritten) | valuable, previously unmigrated; old versions drifted (port 2779, `/yggdrasil` prefix, M.T. auth) |
  | `WinnerProxy/data-flow.md`, `WinnerProxy/troubleshooting.md` | migrated (rewritten) | round 1 |
  | `WinnerProxy/index.md`, `architecture.md`, `configuration.md` | superseded | this wiki's WinnerProxy pages are current and verified against the code |
  | `HRPAuth/operations.md` | superseded + salvaged | startup/background/migration/Redis topics are covered by this wiki's hrpauth architecture/configuration/database-migrations pages; Yggdrasil-side tasks moved to the Yggdrasil-API service; deletion/restoration flow salvaged into the architecture page; the `register.manage` advice and keygen content are dead |
  | `HRPAuth/configuration.md`, `architecture.md`, `index.md`, `quick-start.md`, `api-overview.md` | superseded | this wiki's hrpauth pages (schema v11, post-split routes) replace them; the dead HA-Contract pointer in `configuration.md` was fixed in the frozen repo itself |
  | `HRPAuth/data-models.md`, `token-system.md`, `microservices.md`, `feature-flags.md`, `profile-keys.md` | superseded by HA-Contract | contracts centralize in `HA-Contract/docs/dev/HRPAuth/` (authoritative); the frozen copies document pre-split state (`/services/list`, `/services/sdk/:name`, monolith Yggdrasil stack) |
  | `HASkinProxy/api.md`, `index.md` | superseded | this wiki's haskinproxy pages cover the same surface |
  | `docs/guide/*`, `docs/reference/*`, `docs/index/faq/changelog/about` | superseded | this wiki has its own current guide/reference/about pages; the frozen set describes the old repo layout |
  | `README.md`, `knowledge/*` | not site content | repository meta / ADR memos; stay in the frozen repo |

## Upstream drift documented (not fixed) here

- WinnerProxy hasJoined stage 3 (`POST /register` body mismatch) and the batch query double prefix are documented as drift on the WinnerProxy pages; the code fix is tracked in HA-Contract's `docs/dev/WinnerProxy/README.md` and WinnerProxy's knowledge base.
- The HRPAuth-Spigot plugin still sends the retired `manage_token` field on force-bind; harmless (ignored server-side) until the plugin is updated.
- MatchCoreArena-Server's auth client calls `POST /user/lookup-uuid` (found during the 2026-11-05 content spot check), but the HRPAuth core only registers `/user/lookup`; the contract has no `lookup-uuid` either. The wiki documents the MCA client as implemented; the endpoint mismatch is code-side drift to resolve in MCA or HRPAuth.
- HA-Services-Deployer's `deploy/config/hrpauth.yaml.tmpl` still renders `version: "12"` and has no `oauth2.service_clients` block, while HRPAuth expects schema 13 (mismatch only warns; seeding is skipped). Template update belongs in the Deployer repo.

## Verification log

- 2026-11-05 scope cleanup re-verified against HRPAuth `main` (`0ccd223`): `register.manage`, `profile.change-name`, `profile.change-name.as-service` were dropped by `7f8791b` (merged `6919a12`), and a second batch (`user.mojang-bind-enable(.as-service)`, `user.mojang-bind-disable.as-service`, `totp.status(.as-service)`, `email-2fa.status(.as-service)`) by `266c65c` (merged `0ccd223`); `services/oauth2_scopes_test.go` (`TestOrphanScopesStayRemoved`) guards all of them against re-introduction. None of these scopes had a consuming endpoint. This wiki does not reference any of them as valid scopes (verified by full-text search); HA-Contract's `docs/dev/HRPAuth/tokens.md` records the removal. An earlier unattended-pass report claiming `register.manage` / `profile.change-name` were still valid was a stale read taken before these commits landed.
