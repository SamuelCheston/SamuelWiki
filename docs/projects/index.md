# Projects

This section documents every project in the HA ecosystem. Each page covers what the project is responsible for, how it is built, and how to run it.

## Included Here

- **Authentication & Contract**: the authentication core, the Yggdrasil API, the Web UI, and the skin stack
- **Service Orchestration**: the tooling that deploys and operates the services
- **Match & Arena**: the arena server, its clients, and the Bedwars plugins
- **Clients & Tools**: desktop clients and standalone utilities

## Authentication & Contract

- [HA-Contract](/projects/ha-contract/): Single source of truth for API contracts, error codes, and specifications.
- [HRPAuth](/projects/hrpauth/): Core authentication service providing OAuth2 and the Yggdrasil-API.
- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/): Standalone Yggdrasil API provider with game account management.
- [HRPAuth Web](/projects/hrpauth-web/): Frontend SPA for the authentication service.
- [HRPAuth Spigot](/projects/hrpauth-spigot/): Minecraft server plugin that connects the stack to your proxy.
- [HASkinLib](/projects/haskinlib/): Public skin library that stores and serves player textures.
- [HASkinProxy](/projects/haskinproxy/): Compatibility proxy that translates Yggdrasil calls into CustomSkinLoader format.
- [WinnerProxy](/projects/winnerproxy/): Join proxy that keeps a stable UUID for Mojang players.

## Service Orchestration

- [HA Services Deployer](/projects/ha-services-deployer/): Deploys the whole service stack from a single configuration.
- [HA Services Maintenance View](/projects/ha-services-maintenanceview/): Operational dashboard for the running services.
- [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/): Collects satellite SDK packages and injects them into the WebUI build.

## Match & Arena

- [MatchCoreArena Server](/projects/matchcorearena-server/): Authoritative server for arena matchmaking and scoring.
- [MatchCoreArena Client](/projects/matchcorearena-client/): Companion client and lobby for the arena service.
- [MatchCoreArena Maintenance View](/projects/matchcorearena-maintenanceview/): Desktop dashboard for arena operations.
- [BedwarsRel](/projects/bedwarsrel/): Bedwars match plugin with multi-version server support.
- [BedwarsRel MCA](/projects/bedwarsrel-mca/): BedwarsRel variant built to plug into MatchCoreArena.

## Clients & Tools

- [SamuelClient](/projects/samuelclient/): Desktop client for managing your own account.
- [BS2HA](/projects/bs2ha/): Offline CLI that migrates a Blessing-Skin-Server database into HRPAuth.

## When to Read This Section

- When you are picking up a project for the first time
- When you need to know which service owns which responsibility
- When you are changing an interface and need to see who consumes it

## Related

- [Getting Started](/guide/): how the stack fits together at runtime
- [Configuration Guide](/guide/how-to-use-conf-file): the configuration file of every core service
- [API Standards](/projects/ha-contract/api-standards): the contract every business API must follow
