# Architecture

HRPAuth is the business core of the system. Since the 2026-10 service split it serves the business API and the microservice extension layer itself, while the Yggdrasil protocol surface lives in the [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) service, which the core relays under the `/yggdrasil-api` prefix.

## Request Layers

### Business API

Everything the Web UI and third-party clients use. It runs on OAuth2 bearer tokens.

- `/oauth/*`: authorization, login ticket, token issue, refresh, revoke
- `/register`, `/logout`, `/forgot-password`, `/reset-password`
- `/user`, `/user/lookup`, `/user/deleted`, `/change-username`, `/user/security/*`
- `/webauthn/*`: passkey registration and login
- `/email-verification`, `/email-2fa/*`, `/totp/*`, `/captcha/*`
- `/internal/*`: credential verification, token verification, and account claiming for satellites

Login is an OAuth2 authorization-code flow (with PKCE for the first-party WebUI); there is no standalone `/login` route.

### Yggdrasil API

Everything a Minecraft client talks to — `accessToken` plus `clientToken`, `/authserver/*`, `/sessionserver/*`, `/api/profiles/minecraft`, texture routes, and `/minecraftservices/*`. Since the split these routes are served by the [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) service; the core only relays the `/yggdrasil-api` prefix to it. See that project's pages for the route detail.

### Microservice Extension Layer

How satellites plug into the Web UI. The main service flow itself is not extensible; only the steps before and after it are.

- `POST /services/presence`: register a heartbeat, declare region, SDK address, and auth level
- `POST /services/auth-key`: issue the temporary internal key used for `X-Internal-Key` authentication between services
- `POST /services/route` and `POST /services/hook`: register extension routes and hooks
- `POST /services/relay`: declare relay rules for frontend-accessible paths; `GET /services/relay` lists them
- `/services/sdk-packages`: upload, list, fetch, download, and delete compile-time SDK packages

## Two Main Flows

```text
Browser / WebUI
  -> JSON or form request
  -> Auth / User / TOTP / Captcha Controller
  -> Service
  -> MySQL / Redis
```

```text
Minecraft client / authlib-injector
  -> core relay (/yggdrasil-api prefix)
  -> HRPAuth Yggdrasil API service
  -> its own MySQL / file storage
```

## Two Token Systems

This is the single most important thing to understand about the platform.

### Business tokens

- Stored in `oauth2_access_tokens` and `oauth2_refresh_tokens`
- First-party login completes with `login_ticket` plus `TOTP`
- Used by every business route

### Yggdrasil tokens

- `accessToken` and `clientToken`
- Recorded in the `tokens` table of the [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) service
- Three states: `valid`, `temporarily_invalid`, `invalid`

The two systems are fully isolated. A business access token will not work against a Yggdrasil route, and a Yggdrasil token will not work against a business route.

## Background Tasks

Two periodic cleanup tasks start with the core: the deleted-accounts cleanup (every 5 days) and the OAuth2 token cleanup (every 24 hours). The Yggdrasil-side sweeps (session tokens, bot users, mbe timeouts) run in the HRPAuth Yggdrasil API service instead.

## Account Deletion and Restoration

- `DELETE /user` (password in the body, `user.delete` scope) soft-deletes the account: `users.deleted_at` is set and the UID is recorded in `deleted_accounts`. The account's tokens are revoked, so it is offline immediately.
- When the user logs in again with correct credentials before the hard cleanup runs, the login clears the deletion mark and removes the `deleted_accounts` record — the account is restored automatically.
- The deleted-accounts cleanup hard-deletes (cascade) accounts marked for more than 3 days. With the 5-day task interval, the effective grace period is between 3 and 8 days.

## Startup Behaviour

The service prefers to do whatever it can automatically at startup.

- generates `config.yaml` when it is missing
- migrates an older configuration to the current version
- applies the pending database migrations once the database connection is up
- ensures the built-in OAuth2 clients (the internal super client and the first-party WebUI client)

That makes the first deployment straightforward, but it also means you should read the startup log carefully.

## Texture Storage

Texture uploads and delivery are part of the Yggdrasil surface and live in the [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) service since the split; see that project's pages for the storage detail.

## Related Pages

- [Overview](/projects/hrpauth/)
- [Configuration & API](/projects/hrpauth/configuration)
- [Token System](/projects/hrpauth/configuration#token-types)
