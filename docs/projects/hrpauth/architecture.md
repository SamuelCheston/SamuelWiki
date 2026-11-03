# Architecture

HRPAuth serves two families of APIs from a single process. Knowing which family a route belongs to is the fastest way to read the codebase.

## Request Layers

### Business API

Everything the Web UI and third-party clients use. It runs on OAuth2 bearer tokens.

- `/oauth/*`: authorization, token issue, refresh, revoke
- `/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`
- `/user`, `/change-username`, `/user/security/*`
- `/webauthn/*`: passkey registration and login
- `/email-verification`, `/email-2fa/*`, `/totp/*`, `/captcha/*`
- `/texture/*`
- `/internal/*`: credential and token verification for satellites

### Yggdrasil API

Everything a Minecraft client talks to. It runs on `accessToken` plus `clientToken`.

- `/authserver/*`: authenticate, refresh, validate, signout
- `/sessionserver/*`: join, hasJoined, profile
- `/api/profiles/minecraft`
- `/textures/:hash`, `/skins/MinecraftSkins/:username`
- `/minecraftservices/*`: certificates and public keys for chat signing

### Microservice Extension Layer

How satellites plug into the Web UI. The main service flow itself is not extensible; only the steps before and after it are.

- `POST /services/presence`: register a heartbeat, declare region, SDK address, and auth level
- `GET /services/list`: discover services relevant to the current region
- `GET /services/sdk/:name`: load the SDK usage notes
- `POST /services/relay`: declare relay rules for frontend-accessible paths
- `POST /services/sdk-packages`: upload a compile-time SDK package

## Two Main Flows

```text
浏览器 / WebUI
  -> JSON 或表单请求
  -> Auth / User / TOTP / Texture / Captcha Controller
  -> Service
  -> MySQL / Redis / 文件存储
```

```text
Minecraft 客户端 / Authlib-Injector
  -> Yggdrasil Controller
  -> AuthService / TextureService
  -> MySQL / 文件存储
```

## Two Token Systems

This is the single most important thing to understand about the service.

### Business tokens

- Stored in `oauth2_access_tokens` and `oauth2_refresh_tokens`
- First-party login completes with `login_ticket` plus `TOTP`
- Used by every business route

### Yggdrasil tokens

- `accessToken` and `clientToken`
- Recorded in the `tokens` table
- Three states: `valid`, `temporarily_invalid`, `invalid`

The two systems are fully isolated. A business access token will not work against a Yggdrasil route, and a Yggdrasil token will not work against a business route.

## Background Tasks

Five periodic tasks start with the service.

1. Yggdrasil token cleanup, every hour
2. OAuth2 token cleanup, every 24 hours
3. Bot user cleanup, every 24 hours
4. Session cleanup, every 24 hours
5. Texture cleanup, every hour

## Startup Behaviour

The service prefers to do whatever it can automatically at startup.

- generates `config.yaml` when it is missing
- migrates an older configuration to the current version
- prepares the signing key paths
- applies the database migrations

That makes the first deployment straightforward, but it also means you should read the startup log carefully.

## Texture Storage

The business route `/texture/*` and the Yggdrasil texture routes operate on the same underlying data.

- files live in `textures_storage`
- records live in `profile_properties`
- both are served through `/textures/:hash`

A skin uploaded from the Web UI therefore shows up in Yggdrasil profile lookups as well.

## Related Pages

- [Overview](/projects/hrpauth/)
- [Configuration & API](/projects/hrpauth/configuration)
- [Token System](/projects/hrpauth/configuration#token-types)
