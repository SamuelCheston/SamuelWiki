# Plugin Tiers

Avalon plugins are separate processes that observe the server and optionally veto actions. This page summarizes the model so readers can tell which tier fits their use case; the full developer documentation lives in the Avalon repository under `docs/plugins/`.

## What A Plugin Is

A plugin is an HTTP **server**: the plugin author runs the process, and Avalon calls it. The direction is strictly one-way — Avalon to plugin. Plugins never connect to Avalon, never query it, and no third-party code ever loads into the game engine's JVM. The contract authority is HA-Contract (`docs/api/openapi/avalon-plugin-v1.yaml`).

## The Three Tiers

| Tier | Semantics | When Avalon fails to reach the plugin | Fits |
|---|---|---|---|
| **observe** | Best-effort read-only notification; acknowledge with 2xx | The event is dropped and counted; no retry | Audit trails, statistics mirrors, notifications — anything where a lost event is acceptable |
| **veto** | Synchronous consultation; the plugin may answer "not allowed" with a readable reason | Fail-open: the action proceeds as if no veto existed | Admission policies: room creation, player joins, connection filtering, starting matches, in-game command governance |
| **deliver** | Asynchronous, at-least-once delivery with a persistent write-ahead queue; the plugin must deduplicate by `eventId` | Retried with backoff; replayed after an Avalon restart | Anything that must not be lost: match results, billing-grade bookkeeping |

Veto consultations have hard timeouts (admission-scale by default, a tighter budget for in-game commands); exceeding them also fails open. A broken or slow plugin can never wedge the server.

## Which Events Can Be Vetoed

Most events are observe-only. Veto participation comes in two forms:

- **By subscription**: `room.create` — subscribing to it participates in room-creation admission.
- **By explicit authorization**: `player.join`, `unit.operation`, `factory.build`, `connection.new`, `game.start` — vetoing these requires **both gates**: the plugin's manifest declares `veto: true` for the event, *and* the operator lists the plugin for that event in the `vetoEvents` authorization list. Either gate alone is not enough; the default is deny. The check lives in `internal/plugin/hub.go::vetoConsulted`.

The authoritative event list (names, payloads, veto consequences, timeout budgets) is the event catalog in Avalon `docs/plugins/EVENT-CATALOG.md`, which carries a machine-readable block kept in sync with the code and the contract by CI.

## What A Veto Does

| Event | Observable effect of a veto |
|---|---|
| `room.create` | The room is not created (startup fails with the reason / the proxy answers forbidden / the relay error channel carries the reason) |
| `player.join` | The player is kicked immediately after entering, with the sanitized reason delivered to them |
| `game.start` | The start is cancelled; the initiating admin receives the reason, automatic starts log it only |
| `unit.operation` / `factory.build` | The command packet is dropped before reaching the engine; the reason goes to the log only |
| `connection.new` | The bare connection is dropped at its first packet; the reason goes to the log only |

## What Plugins Do Not Do

These are directional exclusions, not pending features (Avalon `docs/plugins/NON-GOALS.md`):

- No in-match engine state (kills, damage, economy, positions) — the engine is closed-source and Avalon has no truthful source for it.
- No interception of console operator commands — the last control lever must stay immune to third-party failure.
- No plugin-to-player write channel (messages, kicks, mutes) and no plugin-to-Avalon queries — the contract is one-way by design.
- No relay-side events, no in-JVM loading (ever), no runtime download or self-update of plugin artifacts, no mod-facing plugin APIs.

## Operating Plugins

Plugins are registered in Avalon's `data/Plugins.json`: name, base URL, shared hex secrets, enabled flag, and the `vetoEvents` authorization list.

- **Empty configuration = zero regression**: with no file or no entries, every admission path passes immediately and no network I/O happens.
- **Invalid configuration = startup failure**: bad JSON, duplicate names, malformed URLs, weak secrets, or unknown veto events refuse to start Avalon, with the offending entry and field named. There is no silent degradation.
- **No hot reload**: enabling, disabling, or changing a plugin requires an Avalon restart. Disabling a misbehaving plugin is: set `enabled` to false (or clear the entries), restart.
- Request/response integrity is protected by bidirectional HMAC signatures with the shared secrets; key rotation is done by listing old and new secrets side by side.

## Related

- Avalon `docs/plugins/`: GETTING-STARTED, EVENT-CATALOG, AUTH-AND-NEGOTIATION, FAILURE-MODES, NON-GOALS, and a runnable Go template with self-tests
- Avalon `knowledge/0006-out-of-process-plugin-extension-points.md` and `knowledge/0010-plugin-v2-implementation-status.md`: design decisions and implementation status
- [HA-Contract](/projects/ha-contract/): home of the `avalon-plugin-v1` contract
