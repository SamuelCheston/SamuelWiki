# Troubleshooting

Common problems, log lines, and their fixes. Endpoint behavior is verified against the current code and the HA-Contract dev contract.

## Three quick checks

```bash
# 1. WinnerProxy itself (default port 2777)
curl http://127.0.0.1:2777/health
# → {"status":"ok"}

# 2. The HRPAuth upstream is reachable (default core port 2778)
curl http://127.0.0.1:2778/
# → Yggdrasil meta JSON

# 3. Mojang outbound is reachable
curl -sI 'https://sessionserver.mojang.com/session/minecraft/hasJoined?username=Notch'
# → 204/200 (204 is fine; Notch has no active session)
```

If any of these fail, fix the underlying connectivity first.

## All players are kicked with "Failed to verify username"

Likely causes:

1. The Minecraft side is not configured for the proxy. With authlib-injector the JVM argument must point at the proxy root (or the `/winnerproxy` prefix):

   ```text
   -javaagent:authlib-injector.jar=http://your-winnerproxy:2777
   ```

2. WinnerProxy cannot reach HRPAuth. Look for `hrpauth hasJoined error, falling back to mojang: ...` in the log and check `upstreams.hrpauth.url` (default `http://127.0.0.1:2778/yggdrasil-api/`).
3. WinnerProxy cannot reach Mojang. Look for Mojang errors in the log; some data centers block Mojang by IP range. Whitelist `sessionserver.mojang.com` and `api.minecraftservices.com`.

## Mojang players cannot join (503), HRPAuth players are fine

This is the current, documented upstream drift: hasJoined stage 3 posts `{username, password, email, mojang_uuid}` to `POST /register`, but the upstream route now requires `identifier`, so the call fails `400` and the proxy answers `503`.

- The log shows `hrpauth register failed: ...` for every affected join
- This is not an outage of the proxy; HRPAuth-account joins (stage 1) keep working
- The fix is switching stage 3 to `POST /internal/proxy-register` (X-Internal-Key from `POST /services/auth-key`), tracked in HA-Contract's WinnerProxy dev contract

Until then, Mojang players need an HRPAuth account and a normal HRPAuth login to join.

## Batch lookups fail with 502

The former drift — the client posted to `{base}/yggdrasil/api/profiles/minecraft`, which after the relay stripped `/yggdrasil-api` arrived at the upstream as `/yggdrasil/api/profiles/minecraft` (not a registered route) and answered `500` — was fixed on 2026-11-05 (WinnerProxy `4ded866`). The proxy now posts prefix-less to `POST /api/profiles/minecraft`. A batch lookup now fails with `502` only when the upstream answers `404` (`{"error": "hrpauth batch endpoint missing"}`) or is unreachable (`{"error": "hrpauth upstream unavailable"}`); check that the relay registers the `/api/profiles/minecraft` route and that the HRPAuth Yggdrasil API service is up.

## Player renamed on Mojang — in-game UUID changed

The in-game UUID is the HRPAuth-side identity, not the Mojang UUID, and it does not follow Mojang renames. After a rename, stages 1-2 see the new name and stage 3 would create a fresh account for it (once the registration drift is fixed). To keep the old in-game identity, the player changes the username on their HRPAuth account instead (`/change-username` on the HRPAuth core, available through the WebUI).

## Log: `username_already_bound, rejecting mojang player`

Meaning: a Mojang player tried to join with a name that belongs to an existing account with a different Mojang binding. The join is rejected with `204`.

Investigate:

1. Find the account with that username upstream and note its Mojang binding.
2. Compare it with the `uuid=` in the log line.
3. Different → someone is trying to take an existing identity.

Fixes:

- Legitimate player with a new Mojang account: an operator can move the binding with `/ha forcebind` (see below), or the player joins under their real account first.
- Attacker: no action needed; the rejection is the protection.

## Log: `hrpauth register failed`

Stage 3 failed. Today the expected cause is the registration drift above (`400`). Other possible causes: the upstream is down or slow (`upstreams.hrpauth.timeout_sec`, default 10s), or the OAuth2 credentials of `upstreams.hrpauth` are wrong.

## Log: `hrpauth hasJoined error, falling back to mojang`

HRPAuth answered 5xx or the network failed in stage 1. WinnerProxy continues with Mojang, so players may still join, but every request logs a WARN. Check HRPAuth health and the network path; raise `upstreams.hrpauth.timeout_sec` if the upstream is merely slow.

## Log: `generate password failed`

Rare; `crypto/rand` failed. This is an OS-level problem (missing entropy source, container without urandom). Fix the host, not the proxy.

## How do players bind their Mojang account to HRPAuth?

The historical `POST /user/declare-email` and the `mbe` opt-in flow no longer exist. The current paths:

- **Claim flow (player)**: the player runs `/ha reg <email> <password>` on the Velocity proxy. The [HRPAuth Spigot](/projects/hrpauth-spigot/) plugin calls `POST /admin/claim-user` on HRPAuth Yggdrasil API (through the core's `/yggdrasil-api` relay) and the proxy-registered account becomes a normal account with an email and a password.
- **Force bind (operator)**: `/ha forcebind <email> <password>` calls `POST /admin/force-bind`, transferring the Mojang UUID from the proxy account to the target account. Like claim, it authenticates with a scoped OAuth2 service token (`user.force-bind.as-service`); the historical manage token is retired.
- **Self-service bind switches**: HRPAuth Yggdrasil API exposes `POST /player/mojang-bind-enable` and `POST /player/mojang-bind-disable` (player Bearer token). Enabling starts a 15-minute countdown that clears the flag again if the binding never happens.

## Testing without real Mojang

Disable the official upstream in `config.yml`:

```yaml
upstreams:
  official:
    enabled: false
```

Mojang players then get `204` from stage 2. To simulate a Mojang 200, run a local mock and point `upstreams.official.url` at it.

## Multiple instances behind a load balancer

Possible, with caveats:

- The profile cache is per-instance, so the hit rate drops
- All instances share the same OAuth2 client credentials
- No state synchronization is needed; instances converge on the same upstream state

A single instance is enough for most workloads.

## Rotating the upstream credentials

1. Create or rotate the OAuth2 client on HRPAuth that WinnerProxy uses.
2. Update `upstreams.hrpauth.client_id` / `client_secret` (and `hrpauth.client_id` / `client_secret` when set separately) in `config.yml`.
3. Restart WinnerProxy. During the restart window the old instance keeps the old token; expect a few seconds of failed upstream calls.

## Related Pages

- [Data Flow](/projects/winnerproxy/data-flow): the stage-by-stage request flow
- [Architecture](/projects/winnerproxy/architecture): components and identity model
- [Configuration](/projects/winnerproxy/configuration): every configuration key
