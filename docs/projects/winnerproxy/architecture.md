# Architecture

WinnerProxy answers one question for a Minecraft server: who is joining, and under which UUID. Everything else in the process exists to make that answer come from HRPAuth, even when the player signed in with a Mojang account.

## Upstream Abstraction

### The interface

`internal/proxy` defines `UpstreamService`, the minimal contract an upstream has to satisfy.

```text
HasJoined(params url.Values) (*hrpauth.PlayerProfile, error)
QueryProfile(uuid string, unsigned bool) (*hrpauth.PlayerProfile, error)
BatchQuery(names []string) ([]*hrpauth.PlayerProfile, error)
ID() string
```

### The two implementations

- `HrpauthService` wraps the HRPAuth client. Its `ID()` is `hrpauth`.
- `MojangService` talks to `api.minecraftservices.com`. Its `ID()` is `mojang`, and it only exists when `upstreams.official.enabled` is `true`.

The handler looks up an upstream by `ID()`, so adding a third provider means implementing the interface and appending it to the service list. Nothing else changes.

## The hasJoined Flow

`hasJoined` is the only route with real logic. It runs in three stages.

```text
GET /sessionserver/session/minecraft/hasJoined
  -> stage 1  HRPAuth hasJoined
       200 -> return the HRPAuth profile, done
  -> stage 2  Mojang hasJoined
       200 -> keep the Mojang UUID and the Mojang skin
  -> stage 3  POST /register on HRPAuth
       200 -> return the HRPAuth profile_id with the Mojang skin
```

### Stage 1: HRPAuth

The query parameters are forwarded to HRPAuth verbatim, so parameters the upstream may add later, such as `ip`, work without a WinnerProxy change.

A `200` with a real profile ends the flow. The profile is also written into the cache under its UUID, which warms the later profile lookups.

### Stage 2: Mojang

When HRPAuth has no record, the same parameters are sent to the official Mojang sessionserver.

A `200` gives you the Mojang UUID and the Mojang skin. The result is cached under the player name, so repeated join attempts inside the TTL skip the Mojang roundtrip.

### Stage 3: Proxy registration

The proxy creates the HRPAuth-side account on demand.

- The player name and the Mojang UUID are sent to `POST /register` on HRPAuth, together with a random password the player never sees
- On success, the response carries the HRPAuth `profile_id`, which becomes the identity returned to the game server
- The skin still comes from Mojang, so the player keeps their official look

### Failure modes

- Every upstream answered `204`: the proxy answers `204 No Content`
- HRPAuth answered `5xx` or the network failed: a warning is logged and the flow continues at stage 2
- Mojang answered `5xx` or the network failed: the proxy answers `204 No Content`
- Registration returned `409` with `username_already_bound`: a warning is logged and the proxy answers `204 No Content`, because the name is already taken by an account that cannot be bound
- Registration failed for any other reason: the proxy answers `503` with `{"error": "auth backend unavailable"}`

A `204` here means "this join is not allowed", which is the answer a Yggdrasil client expects.

## Identity Model

### One UUID per player

The Minecraft server always sees the HRPAuth `profiles.id`. The Mojang UUID never leaves the proxy, except in the registration request.

The same player always shows up with one UUID, whatever login path they used. The Mojang UUID never leaves the proxy, except in the registration request.

### Skin passthrough

The skin is taken from whichever path answered.

- Stage 1 returns the skin stored in HRPAuth
- Stage 3 returns the skin signed by Mojang

The difference is intentional. An HRPAuth account shows the skin stored in HA, a Mojang account shows its official skin, and a game server has no way to tell which path produced the answer.

### The Mojang link

`users.mojang_uuid` exists inside HRPAuth, not inside the proxy. It answers two questions: which Mojang player equals which HRPAuth player, and whether a player name is already bound to an account. WinnerProxy only supplies the value, through the `mojang_uuid` field of the registration request.

## Cache Layer

`internal/cache` exposes a `ProfileCache` interface with two implementations: a freecache-backed one and a noop one.

### Two keyspaces

- `ha:profile:<uuid>` holds HRPAuth profiles
- `mojang:hasjoined:<name>` holds Mojang profiles

Both live in the same store with disjoint keys. The default TTL is 300 seconds.

### Negative results are not cached

`204` answers and upstream errors are never written to the cache. A player who registers a new account is picked up on the next join instead of waiting out a stale negative entry.

### Turning the cache off

`cache.size = 0` selects the noop implementation. Every lookup then goes to the upstream.

## Presence and Relay Rules

At startup the proxy registers itself in HRPAuth through the microservice extension layer. The handshake runs in the background and never blocks the listener.

### The relay table

The proxy registers eleven relay rules, all under the `/winnerproxy` prefix.

```text
/                       /authserver                /sessionserver
/api/profiles/minecraft /textures                  /previews
/texture                /skin                      /skins
/minecraftservices      /register
```

The destination is `<prefix><path>`, the source is `<server.public_url><path>`. When `server.public_url` is empty, the relay registration is skipped.

### The presence payload

- `security_level: 0`, so anonymous relay access is allowed for Yggdrasil traffic
- `frontend_areas: ["webui-dash"]`, so the service shows up in the WebUI dashboard
- the root metadata of HRPAuth, which lets HRPAuth aggregate the Yggdrasil information of the proxy

## Routes

| Route | Purpose |
|---|---|
| `GET /health` | liveness probe, returns `{"status": "ok"}` |
| `GET /` | Yggdrasil root metadata, passed through from HRPAuth |
| `GET /winnerproxy` | the same root metadata under the prefix |
| `GET /sessionserver/session/minecraft/hasJoined` | the three-stage join query |
| `GET /sessionserver/session/minecraft/profile/:uuid` | profile lookup by UUID |
| `POST /api/profiles/minecraft` | batch lookup by name |

The Yggdrasil group is bound twice, at `/` and at `/winnerproxy`. Launchers and legacy probes use the prefix-less form, HA's own clients use the prefixed form.

## What WinnerProxy Deliberately Does Not Do

- It does not store player data. There is no database and no Redis, and every piece of identity lives in HRPAuth
- It does not implement the Minecraft login endpoints. `/authserver` is relayed to HRPAuth, not served here
- It does not rewrite skins. It passes through whatever the answering upstream provided
- It does not cache failures, and it does not cache for long
- It does not block startup when HRPAuth is unreachable. The listener comes up either way, and the proxy fails per request instead
- It does not expose the Mojang UUID to the game server

## Related Pages

- [Overview](/projects/winnerproxy/)
- [Configuration](/projects/winnerproxy/configuration)
- [HRPAuth Architecture](/projects/hrpauth/architecture)
