# Mod Assembly

Modded rooms require a specific set of mods. RW-Mod-Injector fetches exactly that set, installs it, and takes the player into the room — and can put the client back the way it was afterwards. This page covers what a player sees and, below that, how the chain works.

## For Players

### One-Time Setup

An installer places the injector next to the game and generates a wrapper launch script; the player launches the game through that script from then on. No game files are modified and no player credentials are involved — joining rooms still uses the game's own connection.

### Commands

| Command | Effect |
|---|---|
| `/inj join <room code>` | Assemble the room's mods and enter it |
| `/inj restore` | Return to the mod state from before the last assembly |
| `/inj status` | Show the current injector state |
| `/inj help` | Show help |

The commands are intercepted in the client's chat and never sent to the server. Progress is reported as system messages: fetching, downloading, installing, leaving the room, applying the mod set, hot-reloading, reconnecting, and finally the jump into the room.

### When Something Fails

Every failure class has one player-facing message with a conclusion and a next step. Technical detail (URLs, hashes, stack traces) goes to the log only. Classification lives in `Assembler.java::friendlyFailure`.

| Failure | What you see (in-game message) | Next step |
|---|---|---|
| Manifest unreachable | "Couldn't fetch the mod list for this room (control server unreachable?). You stayed in the lobby - try /inj join again in a moment." | Retry `/inj join` later |
| Hash mismatch | "Security check failed: a mod file did not match the room manifest and was NOT installed. The room's mod pack may be corrupted - tell the server operator." | Tell the operator; the file is never retried |
| Truncated download | "A mod download arrived incomplete. You stayed in the lobby - try /inj join again." | Retry `/inj join` |
| Mod folder not writable | "Can't write to the mod folder (permissions or disk full?). Fix it and try /inj join again." | Fix permissions or disk space, retry |
| Mod pack too large | "The room's mod pack is too large to install. Tell the server operator." | Tell the operator |
| Corrupt package | "A mod file is corrupt and was NOT installed. The room's mod pack may be broken - tell the server operator." | Tell the operator |
| Download failed | "Downloading a mod file failed (server problem). You stayed in the lobby - try /inj join again." | Retry `/inj join` |
| Not connected to a lobby | "Connect to the lobby first, then use /inj join \<room code\>." | Connect to the lobby first |
| Reload failed | "Applying the mod set failed during the unit reload. Your previous mod set was restored - if the game misbehaves, restart it." | Restart the game |
| Reconnect failed | "Mods are applied, but reconnecting to the lobby failed - please reconnect manually." | Reconnect manually |

A failed assembly never leaves the client half-assembled: the player stays in (or is returned to) the lobby, and temporary files are cleaned up.

### Restoring The Previous State

`/inj restore` replays a snapshot taken before the last assembly: previously installed mods return to their previous enabled/disabled state, mods installed by the assembly are disabled, and the snapshot is cleared afterwards. Restoration uses the same leave-room, reload, reconnect sequence as assembly.

## How The Chain Works

### Manifest And Content Endpoints

The authoritative mod set of a room is the content of the serving Avalon's `data/mods` directory. Avalon enumerates it and serves two read-only control-plane endpoints (`internal/net/gateway/mods.go::handleRoomMods`, `internal/net/gateway/mods.go::handleRoomModFile`):

- `GET /v1/rooms/{code}/mods` — the manifest: per mod a safe file name, SHA-256, and size (`internal/game/manage/modmanifest.go`)
- `GET /v1/rooms/{code}/mods/{file}` — the mod file bytes; the name must match the manifest or the request 404s

### Reconciliation Is Hash-Based

SHA-256 is the only criterion. Already-installed files are hashed and compared with the manifest; a content match counts as present regardless of file name. Missing entries are downloaded to a temporary file, checked for size and hash, and only then renamed into the verified store. A hash mismatch deletes the temporary file and is never retried — the content is untrusted.

### Materialization And Reload

The engine loads directory-form mods from its mods directory, so verified zips are extracted there (with zip-slip protection, into a temporary directory that is renamed into place atomically). Before any of that, the injector snapshots the current enabled state of all installed mods — that snapshot is what `/inj restore` replays.

The engine refuses to reload units while a multiplayer session is active, and the server continuously checks the client's unit registry. Assembly therefore: leaves the room cleanly, performs the hot reload at the main menu (`Engine.java::reloadUnits`), reconnects to the lobby, and only then sends `/goto <room code>` (or connects directly in direct mode). The entry point of the whole flow is `Assembler.java::assembleAndJoin`.

## Configuration

The injector reads `rw-mod-injector.properties` next to its jar (`Config.java::load`):

- `control.url` — base URL of the room's control plane
- `mode` — `cascade` (jump via the proxy) or `direct`
- `direct.target` — target address used in direct mode

## Boundaries

- Content hash only; no signature scheme is active yet (the manifest reserves the fields).
- No credentials anywhere: not in the injector, not in the manifest.
- Client game files are never modified; the engine's kick/verification logic is untouched.
- Per-mod and per-assembly size limits are enforced; oversized packs are refused.

## Related

- [Zero-Mod Lobby and Routing](/game/lobby-and-routing): where assembly starts (the lobby) and how the jump works
- [Regression Script](/game/regression): the end-to-end test that exercises this whole chain, including failure paths
- RW-Mod-Injector `knowledge/0001-injector-design.md` and `knowledge/0002-failure-messaging.md`: design decisions and the full failure-message table
