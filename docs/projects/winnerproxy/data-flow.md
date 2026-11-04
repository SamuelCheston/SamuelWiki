# Data Flow

This page details exactly what happens when a Minecraft server calls WinnerProxy's `hasJoined` endpoint, including every branch and edge case. All endpoint semantics are verified against the current code and the HA-Contract dev contract.

## Overview

```text
Minecraft server (online-mode=true, authlib-injector pointing at WinnerProxy)
  │
  │ GET /sessionserver/session/minecraft/hasJoined?username=X&serverId=Y
  ▼
WinnerProxy (default listener :2777)
  │
  ├─► Stage 1: HRPAuth auth path
  │     GET {upstreams.hrpauth.url}/sessionserver/session/minecraft/hasJoined?...
  │     ├─ 200 + profile → return it verbatim to Minecraft. DONE.
  │     ├─ 204 → fall through to Stage 2.
  │     └─ 5xx / network error → log WARN, fall through to Stage 2.
  │
  ├─► Stage 2: Mojang auth path
  │     GET https://sessionserver.mojang.com/session/minecraft/hasJoined?...
  │     ├─ 200 + mojangProfile → extract mojangUUID, proceed to Stage 3.
  │     ├─ 204 → return 204 to Minecraft. DONE.
  │     └─ 5xx / network error → return 204. DONE.
  │
  └─► Stage 3: Proxy registration
        POST {upstreams.hrpauth.url}/register
        Header: Authorization: Bearer <OAuth2 service token>
        Body: { username, password (random 22 chars), email: "",
                mojang_uuid }
        │
        ├─ 200 + {profile_id, ...} →
        │     Return to Minecraft:
        │       id: profile_id
        │       name: <mojangProfile.name>
        │       properties: mojangProfile.properties
        │     DONE.
        │
        ├─ 409 (username_already_bound) →
        │     log WARN, return 204. DONE.
        │
        └─ any other error →
              log ERROR, return 503 {"error":"auth backend unavailable"}. DONE.
```

The default `upstreams.hrpauth.url` is `http://127.0.0.1:2778/yggdrasil-api/`: the calls go to the HRPAuth core and are relayed to the [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) service, with the relay stripping the `/yggdrasil-api` prefix.

## Stage 1: HRPAuth auth path

HRPAuth's `hasJoined` validates a session that the player established through `/authserver/authenticate`. If the player logged in with an HRPAuth password, this stage returns 200 with HRPAuth's profile for that player.

What the response looks like to the Minecraft server:

- `id`: the HRPAuth profile id (the player's stable in-game UUID)
- `name`: the HRPAuth username
- `properties`: the skin properties stored in HRPAuth, signed with the Yggdrasil key published in the root metadata

This is the "HRPAuth skin" path: the client verifies the texture signatures against the `signaturePublickey` from the root metadata, which WinnerProxy passes through from HRPAuth (`GET /` and `GET /winnerproxy`).

## Stage 2: Mojang auth path

If Stage 1 returns 204, the player did not use an HRPAuth session. They may be using a Mojang/Microsoft session instead, so the same parameters go to Mojang's sessionserver.

A 200 gives the Mojang-native identity:

- `mojangProfile.id`: the player's Mojang UUID
- `mojangProfile.name`: the player's Mojang username
- `mojangProfile.properties`: the Mojang-signed skin properties

The positive Mojang answer is cached under the player name (`mojang:hasjoined:<name>`), so repeated join attempts inside the TTL skip the Mojang roundtrip.

## Stage 3: Proxy registration

The proxy asks the upstream to create a game account on demand:

```json
{
  "username": "Alice",
  "password": "<random 22-char string>",
  "email": "",
  "mojang_uuid": "f7c77d999f154a66a87dc4a51ef30d19"
}
```

`username` is `mojangProfile.name`; `mojang_uuid` is the UUID with hyphens stripped. The password is generated per request (16 random bytes, base64url) and never shown to anyone. The credential is an OAuth2 Bearer token obtained with the `client_credentials` grant.

On success the proxy composes the answer for the game server:

```json
{
  "id": "<response profile_id>",
  "name": "<mojangProfile.name>",
  "properties": "<mojangProfile.properties — Mojang-signed>"
}
```

`id` and `name` come from HRPAuth so the server sees a stable HRPAuth identity; `properties` come from Mojang so the player keeps their official skin. The vanilla client verifies those properties against Mojang's built-in public key.

### Current drift: stage 3 does not succeed

The upstream `POST /register` (served by HRPAuth Yggdrasil API behind the relay) now binds `{identifier (required), password (required), mojang_uuid}`. The proxy still sends `username`, which does not satisfy `identifier`, so the upstream rejects the request with `400` and the proxy answers `503`. Every Mojang player is affected until the proxy is switched to the contract-sanctioned endpoint:

- `POST /internal/proxy-register` on HRPAuth Yggdrasil API, body `{username, password, mojang_uuid}`, response `data: {account_id, profile_id}`
- authenticated with the `X-Internal-Key` header; the temporary key comes from `POST /services/auth-key` on the HRPAuth core (client-credentials Bearer)

The switch is pending decisions on key lifecycle and response mapping; HA-Contract's `docs/dev/WinnerProxy/README.md` tracks the same state.

## Failure matrix

| Stage | Upstream response | WinnerProxy response | Log level |
|---|---|---|---|
| 1 | 200 + profile | 200 + HRPAuth profile | DEBUG |
| 1 | 204 | (fall through to Stage 2) | DEBUG |
| 1 | 5xx / network | (fall through to Stage 2) | WARN |
| 2 | 200 + mojangProfile | (continue to Stage 3) | DEBUG |
| 2 | 204 | 204 | INFO |
| 2 | 5xx / network | 204 | WARN |
| 3 | 200 + register response | 200 + composed profile | INFO |
| 3 | 409 (username_already_bound) | 204 | WARN (collision) |
| 3 | any other error (currently: 400 from the drifted contract) | 503 | ERROR |

A `204` from `hasJoined` means "this join is not allowed", which is the answer a Yggdrasil client expects.

## Examples

### Example 1: HRPAuth user Alice joins via HRPAuth password

```text
1. Minecraft server calls hasJoined(username=Alice, serverId=...)
2. WinnerProxy → HRPAuth hasJoined → 200 + {id: <HRPAuth Alice UUID>, name: "Alice", properties: [HRPAuth skin]}
3. WinnerProxy returns 200 + that profile.
4. Minecraft server accepts, Alice is in.
```

### Example 2: Mojang player Bob joins (current upstream)

```text
1. Minecraft server calls hasJoined(username=Bob, serverId=...)
2. WinnerProxy → HRPAuth hasJoined → 204 (no HRPAuth session)
3. WinnerProxy → Mojang hasJoined → 200 + {id: <Mojang Bob UUID>, ...}
4. WinnerProxy → upstream POST /register → 400 (the body sends username,
   the upstream requires identifier)
5. WinnerProxy returns 503 {"error":"auth backend unavailable"}.
6. Minecraft server rejects the join.
```

Once the proxy is switched to `POST /internal/proxy-register`, step 4 becomes a successful account creation and step 5 returns the composed profile with the new HRPAuth UUID and the Mojang skin.

### Example 3: Name collision

```text
1. A Mojang player tries to join as "Alice", but an account named Alice
   already exists upstream with a different binding.
2. Stages 1-2 pass as in Example 2.
3. Stage 3 answers 409 username_already_bound (once the registration
   request shape is fixed).
4. WinnerProxy logs the collision and returns 204; the Mojang player is
   rejected.
```

## After registration: claiming the proxy account

A proxy-registered account has no email and no player-known password. The player-side path to take it over is the claim flow, not a WinnerProxy route:

- The player runs `/ha reg <email> <password>` on the Velocity proxy; the [HRPAuth Spigot](/projects/hrpauth-spigot/) plugin calls `POST /admin/claim-user` on HRPAuth Yggdrasil API
- Operators can transfer the Mojang UUID to another account with `/ha forcebind`, which calls `POST /admin/force-bind`

The historical `POST /user/declare-email` endpoint no longer exists anywhere in the system and has no successor other than this claim flow.

## Why three stages and not a single one?

- **Why HRPAuth first?** Faster (LAN/localhost), and HRPAuth players are the happy path of this design.
- **Why fall back to Mojang?** The whole point: a Mojang player can join an HRPAuth-only server.
- **Why proxy-register in stage 3?** Because HRPAuth is the source of truth. The Minecraft server must see an HRPAuth UUID; a Mojang UUID cannot be returned directly.
- **Why not also call Mojang if HRPAuth is 200?** Two authentications in flight is an edge case treated as "HRPAuth wins". The Minecraft server only validates one session at a time anyway.

## Related Pages

- [Architecture](/projects/winnerproxy/architecture): the components behind this flow
- [Troubleshooting](/projects/winnerproxy/troubleshooting): what the log lines mean
- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/): the upstream that serves stages 1 and 3
