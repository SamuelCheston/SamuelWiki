# WinnerProxy

WinnerProxy is the join proxy of the HA ecosystem. It puts HRPAuth and official Mojang behind one upstream interface, and registers a proxy account in HRPAuth the first time a Mojang player joins a server.

## What It Covers

- One Yggdrasil endpoint for both HRPAuth accounts and official Mojang accounts
- A three-stage `hasJoined` flow: HRPAuth record, Mojang verification, proxy registration
- Automatic proxy account creation in HRPAuth on the first join of a Mojang player (currently blocked by an upstream contract drift, see [Architecture](/projects/winnerproxy/architecture#known-upstream-drift))
- A stable HRPAuth UUID for every player, whatever login path they used
- An in-process profile cache with a short TTL
- Presence and relay registration so launchers and the WebUI can reach the proxy

## Tech Stack

- Go 1.26.4, Gin v1.12
- coocood/freecache for the in-process profile cache
- gopkg.in/yaml.v3 for configuration
- No database, no Redis

## Directory Layout

```text
main.go                # entry point, config loading, presence and relay registration
config/                # configuration structs and default values
internal/handler/      # Yggdrasil dispatch, hasJoined flow, profile and batch queries
internal/proxy/        # upstream abstraction and the HRPAuth and Mojang implementations
internal/hrpauth/      # HRPAuth HTTP client, endpoints and data shapes
internal/router/       # Gin route assembly
internal/cache/        # profile cache interface, freecache and noop implementations
sdk/                   # compile-time SDK package for the WebUI
build/                 # prebuilt binary and the runtime config
```

## Running It

### Prerequisites

- HRPAuth, reachable at its management root (default `http://127.0.0.1:2778`)
- Network access to `https://api.minecraftservices.com`, unless `upstreams.official.enabled` is `false`
- An OAuth2 client on HRPAuth that WinnerProxy can use
- A writable directory next to the binary, for `config.yml`

### Build

```bash
go build -o ./build/winnerproxy
```

### Run

```bash
./build/winnerproxy
```

The default listener is `:2777`. The process keeps running when the presence handshake with HRPAuth fails; the failure is logged and nothing else happens.

## Configuration

`config.yml` lives in the directory of the executable, not in the project root. When it is missing, the service writes a default file and asks you to edit it and restart. Missing keys inside an existing file fall back to the built-in defaults.

- `server`: listen address, public URL, read and write timeouts
- `cache`: profile cache size and TTL
- `log`: log level and format
- `upstreams.hrpauth`: the HRPAuth Yggdrasil upstream and its credentials
- `upstreams.official`: the official Mojang upstream
- `hrpauth`: the HRPAuth management root, presence and SDK upload settings
- `site`: service name and build version

See [Configuration](/projects/winnerproxy/configuration) for the field-by-field details.

## Relationship With Other Projects

- **Depends on** [HRPAuth](/projects/hrpauth/) for every identity decision, and reads its Yggdrasil API
- **Proxies** official Mojang, so a single launcher entry point serves both account types
- **Registers itself** through the HRPAuth microservice extension layer, with presence and relay rules
- **Ships an SDK package** that the [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/) injects into the WebUI build
- **Is related to** [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/), which serves the same protocol without the Mojang fallback

## Related Pages

- [Architecture](/projects/winnerproxy/architecture): how a join query travels through the proxy
- [Data Flow](/projects/winnerproxy/data-flow): the stage-by-stage request details
- [API Reference](/projects/winnerproxy/api): the endpoints the proxy exposes
- [Configuration](/projects/winnerproxy/configuration): the full configuration reference
- [Deployment](/projects/winnerproxy/deployment): binary, systemd and container deployment
- [Troubleshooting](/projects/winnerproxy/troubleshooting): log lines and common failures
- [HRPAuth](/projects/hrpauth/): the service behind the proxy
