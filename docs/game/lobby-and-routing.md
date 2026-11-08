# Zero-Mod Lobby and Routing

One designated backend acts as a lobby that any client can enter regardless of its mods; from there players browse rooms and jump into modded backends through the proxy. This page explains why the lobby can be mod-free, what extra or missing mods mean, and why sub-servers never need public exposure.

## Why A Zero-Mod Lobby Works

The engine has two independent consistency gates, and only one of them involves mods:

- **Registration checksum** — checked when a client registers. It covers the base unit set only; installed mods do not change it.
- **Custom unit list** — the server sends its custom-unit list (names plus checksums) in its server info; the client checks it locally. A missing or mismatched mod fails here, before the lobby is entered.

The lobby backend runs with an empty mod set, so its custom-unit list is empty and the second gate passes trivially for every client. Any client — no mods, some mods, any mods — can enter and stay. The full investigation is recorded in Avalon `knowledge/0009-zero-mod-lobby-and-mod-assembly.md`.

## What Lobby Mode Does

A backend with `cascadeLobby: true` (`internal/data/bean/configs.go::CoreConfig`) starts its engine, creates its room, opens its game port, and lets players connect and stay — but it never starts a match (the lobby branch of `internal/game/seam.go::StartGame`), and it rejects the client `/start` command (`internal/command/clientcommands.go::RegisterClientCommands`). On the Cascade side, the lobby is configured as the default backend, so fresh connections land there.

Modded rooms run in the same lobby mode: the room is created at boot, and the match starts only after players are inside. This is the deployed shape for every backend; the design conclusion and the reason are in Avalon `docs/OPERATIONS.md`.

## Extra Mods Versus Missing Mods

- **Extra installed mods do not block anything.** Registration ignores mods, and the lobby's empty custom-unit list accepts everyone.
- **Missing mods are the only real gate**: a client lacking a required mod fails the custom-unit check when connecting to the modded room. That is exactly what the assembler fixes before the connection happens — see [Mod Assembly](/game/mod-assembly).
- During assembly the injector matches the room's set precisely: required mods are enabled, everything else is disabled for that session. Nothing is deleted.

## Routing: Lobby To Sub-Server

1. The player types `/goto <room code>` in the lobby chat. This is a Cascade proxy command, not an Avalon command.
2. Cascade resolves the room code to the owning backend (`internal/proxy/session.go::commandGoto`).
3. Cascade replies with a reconnect packet whose target is `PublicGameHost:<jump_port>` — its **own** jump listener for that backend, never the backend's real address.
4. The client reconnects to the jump port; the jump listener passes the connection straight through to the backend (`internal/proxy/server.go::Run`).

Consequences:

- **Sub-servers are not publicly exposed.** A backend's game port only needs to be reachable from Cascade; the jump target in every packet is the proxy entry. Backends declare a `jump_port` in the Cascade configuration (`internal/config/config.go::BackendConfig`), and Cascade opens one extra public listener per such backend.
- An empty `PublicGameHost` disables jumping entirely (`/goto` answers that jumping is disabled).
- The room directory that players browse is Cascade's snapshot of the backends' control planes, refreshed continuously.

## Startup Window Note For Automation

Cascade marks a backend healthy only after two consecutive successful probes, while the room snapshot appears after one. Right after a backend starts, rooms can be visible before the backend is healthy; automation that gates on room visibility alone can be rejected with "No available backend". Gate on backend health, not on room appearance.

## Related

- [Mod Assembly](/game/mod-assembly): what happens between the lobby and a modded room
- [Regression Script](/game/regression): real-environment test of the lobby → assembly → jump chain
- Avalon `docs/OPERATIONS.md`: lobby and routing configuration in detail
- Cascade `knowledge/`: proxy design records, including jump routing
