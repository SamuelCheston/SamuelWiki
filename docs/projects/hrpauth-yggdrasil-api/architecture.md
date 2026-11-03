# Architecture

HRPAuth-Yggdrasil-API owns the Minecraft-facing half of the HA authentication stack. The core service keeps the real users; this service keeps the game accounts, the profiles, the tokens, and the texture files, and calls back into the core over OAuth2 whenever it needs to identify a person.

## Division of Work

### The core service

- OAuth2 authorization, the business APIs, and the user directory
- The satellite service endpoints this service relies on: `/services/presence`, `/services/relay`, `/services/auth-key`, `/services/sdk-packages`
- Site metadata the service reads once at startup

### This service

- The Yggdrasil protocol endpoints
- The `accounts`, `profiles`, `tokens`, `sessions`, `profile_keys`, and `profile_properties` tables, all under the `haygg_` prefix
- Texture files under `yggdrasil.server.textures_storage`
- The embedded WebUI SDK package

The two services share nothing but the core user identity. `accounts.core_user_id` is the only link, and it is filled when a core user registers a game account.

## Startup Sequence

1. `InitializeConfig` creates `config.yaml` and the key pair if they are missing, or migrates an older file
2. `config.Load` parses the file into the runtime configuration
3. `database.Init` opens the MySQL connection
4. `EnsureMigrations` runs the pending SQL migrations through golang-migrate
5. `FetchMetadata` reads the site metadata from the core; a failure here only produces a warning
6. `redis.Init` opens the Redis client
7. the background cleanup tasks start
8. the HTTP server binds the configured port
9. two seconds later, in the background, the service registers itself with the core and uploads the SDK package

Step 5 is deliberately non-fatal. Without the core the service still starts, but the metadata stays empty and only proxy accounts can authenticate.

## Microservice Registration

### Presence

The service posts a presence record to `/services/presence`.

- `name`: the value of `microservice.name`
- `ttl_seconds`: the value of `microservice.ttl_seconds`
- `security_level`: `0`, so the relayed Yggdrasil routes stay anonymous
- `scope.name`: `yggdrasil-api`
- `scope.frontend_areas`: `webui-dash`
- `root_metadata.yggdrasil`: the same metadata document the service returns on `GET /`

### Relay rules

The service then posts a relay rule set to `/services/relay`. Each rule maps a core-side path to the same path on this service.

```text
core /yggdrasil-api/authserver   ->  relay_url/authserver
core /yggdrasil-api/sessionserver ->  relay_url/sessionserver
```

The relayed path list is fixed in the code: `/`, `/authserver`, `/sessionserver`, `/api/profiles/minecraft`, `/textures`, `/previews`, `/texture`, `/skin`, `/skins`, `/minecraftservices`, `/register`, `/player`, `/mojang`.

The prefix comes from `microservice.relay_path_prefix` and defaults to `/yggdrasil-api`. The target comes from `microservice.relay_url`, which must be an address the core can reach.

### Internal key

Registration ends with a call to `/services/auth-key` that returns a temporary internal key. The key is sent back as the `X-Internal-Key` header on `/internal/heartbeat` and `/internal/proxy-register`. Those two endpoints reject every request while the key is empty, which is the case when the core was never reachable.

## Endpoint Layers

### Protocol layer

What a game client talks to. Authentication uses `accessToken` plus `clientToken`.

- `/authserver/*`: authenticate, refresh, validate, invalidate, signout
- `/sessionserver/session/minecraft/*`: join, hasJoined, profile
- `/api/profiles/minecraft`
- `/textures/:hash`, `/previews/:fileName`, `/texture/avatar/:uuid`
- `/minecraftservices/*`: certificates and public keys for chat signing

### Business layer

What the WebUI SDK calls. Authentication uses a bearer token, which may be a core OAuth2 access token or a Yggdrasil access token.

- `/player`: account summary, game profile lookup and creation, Mojang bind toggle
- `/mojang/profile/:uuid`, `/texture/mojang/:uuid`: proxying the Mojang sessionserver

### Internal layer

Only the core talks to these, and only with the internal key.

- `/internal/heartbeat`
- `/internal/proxy-register`

## Token and Profile Model

### Accounts and profiles

- `accounts` is the local game account. `core_user_id` points at a core user, `mojang_uuid` at a premium account, and `cbh` tells a human account from a proxy account.
- `profiles` holds the Minecraft character. The primary key is a 32 character UUID without dashes, the name is unique, and the model is `default` or `slim`.
- The WebUI flow creates one profile per account. The UUID is either random, supplied by the user, or looked up from a Mojang username.

### Tokens

- `accessToken` and `clientToken` live in the `tokens` table
- Three states: `valid`, `temporarily_invalid`, `invalid`
- Logging in with a new `clientToken` marks the other tokens of the same account as `temporarily_invalid`
- `yggdrasil.security.max_tokens_per_user` caps how many valid tokens one account may hold; the oldest ones are revoked first

A token that is not in the local table is offered to the core for verification. If the core accepts it, the service treats it as a virtual token bound to the matching local account.

### Sessions

`/join` writes a session row keyed by profile and server, with the client IP and an expiry taken from `yggdrasil.security.session_expiry_seconds`. `hasJoined` reads it back, and with `enable_ip_check` enabled it also compares the request IP with the stored one.

## Texture Pipeline

An upload runs through these steps.

1. the file is decoded and must be a PNG
2. the size is checked against `max_texture_width` and `max_texture_height`; an oversized but proportional image produces a notice, a distorted one produces a warning
3. a `22x17` cape is resized to `64x32`
4. the validated PNG is hashed with SHA-256 and stored as `textures/<hash>`
5. a WebP preview is rendered and stored as `previews/<hash>_<type>.webp`
6. for a skin, the head is cut out and stored as `previews/<hash>_avatar.png`
7. the `textures` profile property is rewritten with the new URL and signed with RSA over SHA-1

The URL in the property is built from `callback.url`. When that is empty, the service falls back to the site URL from the core plus the relay path prefix, so the client reaches the texture through the same relay the rest of the protocol uses.

Replacing a texture does not delete the old property. The old row gets a `delete_when` timestamp seven days in the future and keeps a tombstone value, so a client that still holds the old URL can still resolve it. The hourly cleanup job removes the rows whose timestamp has passed, along with the files that no live property references.

Writers and the cleanup job coordinate through a MySQL advisory lock, so several instances can share one storage directory safely.

## Background Tasks

Five periodic tasks start with the service.

1. token cleanup, every hour
2. session cleanup, every 24 hours
3. proxy account cleanup, every 24 hours
4. Mojang bind timeout sweep, every 30 seconds
5. orphaned texture cleanup, every hour

The Mojang bind sweep matters because enabling the bind flow sets `mbe` on the account and starts a 15 minute countdown. If the user never finishes binding, the sweep clears the flag again.

## SDK Package Delivery

The `sdk/` directory is embedded into the binary with `go:embed sdk/*`. At startup the service packs it into a `tar.gz` archive with `manifest.json` at the root and the `src/` tree below it, then uploads it to `/services/sdk-packages` on the core.

- the package name comes from `manifest.json`
- `microservice.profile_cards` overrides the priority of the profile cards declared in the manifest before the archive is built
- if the core already holds a package with the same name, the service deletes the stale one and uploads again
- a failed upload only produces a warning; the protocol endpoints keep working

The core aggregates the package into the WebUI build through [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/), and the declared routes are mounted under the relay prefix.

## Related Pages

- [Overview](/projects/hrpauth-yggdrasil-api/)
- [API Reference](/projects/hrpauth-yggdrasil-api/api)
- [HRPAuth](/projects/hrpauth/): the core service this one registers with
