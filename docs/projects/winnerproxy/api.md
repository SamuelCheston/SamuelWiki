# API Reference

WinnerProxy exposes five HTTP endpoints: one health probe, one root-metadata route (bound twice), and three Yggdrasil routes. Behavior is verified against the current code and HA-Contract's WinnerProxy dev contract.

## Conventions

- Base URL: `http://<server.addr>`, default `http://127.0.0.1:2777`
- The Yggdrasil routes are bound twice: prefix-less (launchers, legacy probes) and under the `/winnerproxy` prefix (HA's own clients)
- All requests and responses are `application/json` unless noted
- Error bodies look like `{"error": "..."}` with a 4xx/5xx status

## `GET /health`

Liveness probe. Does not touch any upstream.

```json
{ "status": "ok" }
```

## `GET /` and `GET /winnerproxy`

Yggdrasil root metadata, passed through from HRPAuth (`GET /` on the management root), so clients see HA's real `skinDomains` and `signaturePublickey`. When HRPAuth is unreachable the fallback is:

```json
{ "skinDomains": [] }
```

## `GET /sessionserver/session/minecraft/hasJoined`

The session check called by the Minecraft server — the main endpoint, with the three-stage logic described on the [Data Flow](/projects/winnerproxy/data-flow) page.

Query parameters (Yggdrasil standard):

| Name | Type | Required | Description |
|---|---|---|---|
| `username` | string | yes | Minecraft username of the joining player |
| `serverId` | string | yes | Hex SHA-1 of the serverId secret plus the player's session shared key |
| `ip` | string | no | Joining player's IP; forwarded verbatim, so upstream-side IP checks work without a proxy change |

Responses:

- `200`: a `PlayerProfile` object (see below)
- `204`: no upstream validated the session; the game server rejects the join
- `503`: the proxy-registration stage failed — this is what the current upstream drift produces for every Mojang player (see [Architecture](/projects/winnerproxy/architecture#known-upstream-drift))

Cache behavior:

- A stage-1 hit stores the profile under `ha:profile:<uuid>`
- A stage-2 hit stores the Mojang profile under `mojang:hasjoined:<name>`; repeats inside the TTL skip the Mojang roundtrip
- The default TTL is 300 seconds (`cache.ttl_sec`); negative results are never cached

## `GET /sessionserver/session/minecraft/profile/:uuid`

Profile lookup by UUID.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `uuid` (path) | string | — | 32-character profile UUID |
| `unsigned` (query) | bool | `true` | `true` drops texture signatures; `false` keeps them |

Responses:

- `200`: a `PlayerProfile` object
- `404`: the upstream lookup failed

The HA profile cache is consulted first; a miss forwards to the upstream and warms the cache.

## `POST /api/profiles/minecraft`

Batch lookup by username. HRPAuth upstream only — no Mojang fallback and no proxy registration.

Request body: a plain array of usernames.

```json
["alice", "bob", "charlie"]
```

Response `200`: a plain array of `{id, name}` summaries; texture properties are dropped per Yggdrasil convention, and usernames the upstream does not know are silently omitted.

```json
[
  { "id": "a1b2c3d4e5f6...", "name": "alice" },
  { "id": "f6e5d4c3b2a1...", "name": "bob" }
]
```

Responses: `400` for a malformed body, `500` when the upstream call fails. The current upstream drift (the extra `/yggdrasil` path segment, see [Architecture](/projects/winnerproxy/architecture#known-upstream-drift)) makes this route answer `500` against the current upstream. Batch results are not cached.

## Response shape

`PlayerProfile` is the Yggdrasil-standard profile object:

```json
{
  "id": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "name": "Alice",
  "properties": [
    {
      "name": "textures",
      "value": "eyJ0aW1lc3RhbXAi...",
      "signature": "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE..."
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | The HRPAuth-side profile id — always the platform identity, never the Mojang UUID |
| `name` | string | The player name |
| `properties` | array | Texture properties; may be empty |

On the Mojang path of `hasJoined`, `properties` carries the Mojang-signed textures while `id` and `name` stay the HRPAuth-side identity.

## Related Pages

- [Data Flow](/projects/winnerproxy/data-flow): the stage-by-stage logic behind `hasJoined`
- [Architecture](/projects/winnerproxy/architecture): components, identity model, known drift
- [Configuration](/projects/winnerproxy/configuration): every configuration key
