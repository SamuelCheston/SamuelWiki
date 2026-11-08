# Game Services

This section describes the current state of the ecosystem's game stack for Rusted Warfare: how players reach modded rooms, how the proxy routes them, how plugins extend the server, and how the whole stack is deployed and operated.

## What Is In This Stack

- **Avalon** — a single-room game server. Each Avalon instance runs one room backed by its own game engine helper process.
- **Cascade** — the public-facing proxy. Players connect to Cascade once; it routes them to a backend, serves the room directory, and handles server jumps.
- **RW-Mod-Injector** — a client-side assembler injected into the game client. It fetches and installs the mods a room requires before the player enters it.
- **HA Services Deployer** — release manifest, artifact delivery, and opt-in deployment orchestration for the stack.
- **HA Services MaintenanceView** — the browser-based operations panel.
- **Tinyvisor** — the process supervisor that keeps server processes alive; the Deployer drives it during deployments.

## How A Play Session Fits Together

1. The player's client connects to the Cascade proxy and lands in the zero-mod lobby.
2. The player browses the room directory and picks a modded room.
3. The injector fetches that room's mod manifest, downloads and verifies the missing mods, applies them, and reconnects to the lobby.
4. The player types `/goto <room code>`; Cascade points the client at the target backend through its own jump port.
5. After the match, `/inj restore` returns the client to the mod state it had before joining.

## Reading Paths

- **Players**: [Mod Assembly](/game/mod-assembly) explains what you type and what each failure message means; [Zero-Mod Lobby and Routing](/game/lobby-and-routing) explains the lobby and `/goto`.
- **Maintainers**: [Deployment Orchestration](/game/deployment), [Operations Panel](/game/operations-panel), and [Regression Script](/game/regression). The lobby topology in [Zero-Mod Lobby and Routing](/game/lobby-and-routing) is also deployment-relevant.
- **Plugin authors**: [Plugin Tiers](/game/plugins) summarizes the model; the full developer documentation lives in the Avalon repository under `docs/plugins/`.

## Where Details Live

This section records the ecosystem-level current state. Per-repository detail — configuration keys, protocol fields, decision history — lives in each repository's `docs/` and `knowledge/` directories and in HA-Contract. When a page here disagrees with those sources, the repository sources win.

## Related

- [HA Services Deployer](/projects/ha-services-deployer/): project page of the deployment backend
- [HA Services MaintenanceView](/projects/ha-services-maintenanceview/): project page of the operations panel
- [Container Orchestration](/projects/ha-services-deployer/container-orchestration): the Compose template for the platform's auth stack
