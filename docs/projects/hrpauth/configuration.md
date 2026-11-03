# Configuration & API

The service reads a single `config.yaml` from the project root. A complete annotated sample lives in the [Configuration Guide](/guide/how-to-use-conf-file); this page explains how the file is handled and what each block is for.

## Configuration Lifecycle

On startup the service processes the file in this order.

1. Check whether `config.yaml` exists
2. Write the default configuration if it does not
3. Read the `version` field if it does
4. Apply the chain migration when the version is older than the binary supports
5. Only warn, and never rewrite the file, when the version is newer than the binary

## Top-level Blocks

- `version`
- `site`
- `server`
- `security`
- `callback`
- `frontend`
- `keygen`
- `database`
- `verification_code`
- `redis`
- `smtp`
- `manage`
- `yggdrasil`

## Important Blocks

### `site`

The display name and implementation version. It is returned by `GET /status` and embedded in the Yggdrasil metadata.

### `server`

- `port`: listen address, the generated default is `:2778`
- `cors_origin`: allowed CORS origin

### `database`

MySQL connection settings. Database availability is a hard prerequisite for a successful startup, because the migrations run right after the connection is opened.

### `redis`

Used for the graphical captcha, the email verification codes, and the login rate limit counters. Keep the `prefix` isolated when you share one Redis instance between deployments.

### `smtp`

Needed by email verification. Fill this block in early, otherwise a later integration failure tends to be blamed on the API layer.

### `manage`

`oauth2` is the new main entry point for business authentication.

- `oauth2.super_client_id`
- `oauth2.super_client_secret`
- `oauth2.public_client_id`
- `oauth2.public_redirect_uris`
- `oauth2.super_client_extra_scopes`

`manage.token` is still present but is a legacy migration field. It is no longer the primary credential for new routes.

### `security`

Business-layer security settings. This is the block that holds the captcha switch, the password cost, and the rate limits.

### `yggdrasil.server`

Controls what the Minecraft ecosystem sees.

- `name`, `implementation`, `version`
- `signature_public_key_path`, `signature_private_key_path`
- `textures_storage`
- `links.homepage`, `links.register`
- `skin_domains`

When `links` is empty the metadata falls back to values derived from `frontend.url`.

### `yggdrasil.security`

- `token_expiry_days`
- `session_expiry_seconds`
- `max_texture_width`, `max_texture_height`: size limits in pixels, returned as a notice instead of a rejection
- `max_texture_file_size`: size limit in bytes, uploads above it are rejected
- `max_tokens_per_user`: how many valid `accessToken` records one user may hold

### `yggdrasil.feature_flags`

Protocol compatibility switches. See [Feature Flags](/projects/hrpauth/configuration#feature-flags) below.

## Token Types

| Name | Field | Scope | Issued by |
|---|---|---|---|
| OAuth2 access token | `access_token` | Business routes | `/oauth/token`, `/totp/verify` |
| OAuth2 refresh token | `refresh_token` | Token renewal | `/oauth/token` |
| Login ticket | `login_ticket` | Temporary TOTP credential | `/oauth/login-ticket` |
| Yggdrasil access token | `accessToken` | Minecraft client sessions | `/authserver/authenticate` |
| Yggdrasil client token | `clientToken` | Paired with the access token | `/authserver/authenticate` |

## Feature Flags

| Flag | Effect |
|---|---|
| `non_email_login` | Allow a character name instead of an email to log in |
| `legacy_skin_api` | Keep the legacy `GET /skins/MinecraftSkins/{username}.png` route |
| `no_mojang_namespace` | Drop the Mojang namespace from profile properties |
| `enable_mojang_anti_features` | Expose Mojang anti-cheat related metadata |
| `enable_profile_key` | Enable the Minecraft 1.19+ chat signing keys |
| `username_check` | Validate the Minecraft character name format |
| `enable_ip_check` | Verify the IP in `hasJoined` against the session record |

These switches live under `yggdrasil.feature_flags` and only affect the protocol layer, never the business layer.

## Route Groups

### Business routes

`/oauth/*`, `/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/user`, `/change-username`, `/user/security/*`, `/webauthn/*`, `/email-verification`, `/email-2fa/*`, `/totp/*`, `/captcha/*`, `/texture/*`, `/internal/*`.

### Yggdrasil routes

`/authserver/*`, `/sessionserver/*`, `/api/profiles/minecraft`, `/api/user/profile/:uuid/:textureType`, `/textures/:hash`, `/skins/MinecraftSkins/:username`, `/minecraftservices/*`.

### Extension routes

`/services/presence`, `/services/list`, `/services/sdk/:name`, `/services/relay`, `/services/sdk-packages`.

## Easily Misread Points

- `keygen.enable` disables the key generation route when it is `1`. Read it as a kill switch, not an enable switch.
- `callback.url` is the backend address; `frontend.url` is the frontend site address. The metadata fallback uses the latter.
- The captcha settings belong to the top-level `security` block, not to `yggdrasil.security`.
- A business OAuth2 access token and a Yggdrasil `accessToken` are unrelated. Mixing them produces errors that look reasonable but mean nothing.

## Smoke Test

After a fresh start, check these two routes first.

- `GET /status`
- `GET /`

If both answer, the business layer and the Yggdrasil metadata are at least serving traffic.

## Related Pages

- [Overview](/projects/hrpauth/)
- [Architecture](/projects/hrpauth/architecture)
- [API Standards](/projects/ha-contract/api-standards): the contract every business route must follow
