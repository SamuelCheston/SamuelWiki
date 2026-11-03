# HASkinProxy

HASkinProxy is a small proxy that translates Yggdrasil profile data into the CustomSkinLoader (CSL) protocol and serves the texture files behind it. This page covers what the proxy does, how it is built, and how to run it.

## What It Covers

- Translates Yggdrasil profile properties into the CSL profile JSON a CustomSkinLoader client expects
- Resolves a username to a UUID, then fetches the full session profile from the upstream service
- Proxies texture bytes so clients can load skins, capes, and elytras without upstream-specific support
- Forwards texture deletion to the upstream service and evicts the matching local cache entries
- Registers itself with HRPAuth as a microservice and publishes the relay path that exposes the CSL API
- Ships a compile-time SDK package that gives the HRPAuth Web UI a CustomSkinLoader setup page

## Tech Stack

- Go 1.24, Gin v1.9.1
- `coocood/freecache` for in-memory caching of profiles and texture bytes
- `gopkg.in/yaml.v3` for the configuration file
- `golang.org/x/oauth2` with the `clientcredentials` grant for the upstream service token

There is no database and no Redis. All state lives in the local process.

## Directory Layout

```text
main.go                # entry point: config, component wiring, presence and SDK upload, server start
sdkdata.go             # embeds the sdk/ source tree into the binary with embed.FS
sdk_upload.go          # packs the embedded sdk/ tree into a tar.gz and uploads it
config/                # configuration struct, defaults, and auto-generation
internal/handler/      # CSL handlers: profile translation, texture proxy, delete pass-through
internal/hrpauth/      # upstream HRPAuth / Yggdrasil client, including the OAuth2 service token
internal/router/       # Gin route assembly
internal/cache/        # freecache wrapper: JSON cache, raw byte cache, eviction
internal/model/        # CSL and Yggdrasil data structures
sdk/                   # compile-time SDK package: manifest.json and the React page
build/                 # prebuilt binaries and the runtime config
```

## Running It

### Prerequisites

- Go 1.24 or newer
- a reachable upstream Yggdrasil service, `http://localhost:2778` by default
- HRPAuth, if you want the presence handshake, the relay rule, or the SDK package upload

### Build

```bash
go build -o ./build/hasp .
```

### Run

```bash
./build/hasp
```

The proxy listens on `:2702` by default. The README also documents `go run main.go` for development.

## Configuration

The configuration file is `config.yaml`, placed next to the executable rather than in the working directory, so the proxy finds it no matter where you start it. A default file is generated on the first run.

- `server.listen_addr`: listen address, `:2702` by default
- `server.public_url`: externally reachable base URL, reported to HRPAuth as the relay source
- `upstream.base_url`: the upstream Yggdrasil service, `http://localhost:2778` by default
- `upstream.timeout`: upstream request timeout in seconds, `10` by default
- `upstream.client_id`, `upstream.client_secret`: credentials for the OAuth2 `client_credentials` service token
- `cache.profile_ttl`: profile cache lifetime in seconds, `3600` by default
- `cache.texture_ttl`: texture cache lifetime in seconds, `86400` by default
- `cache.max_size_mb`: maximum cache size in MB, `256` by default
- `presence.enabled`: whether to register with HRPAuth, `true` by default
- `presence.name`: service name in the presence registry, `HASkinProxy` by default
- `presence.ttl_seconds`: self-declared record lifetime, `0` means the record never expires
- `sdk.enabled`: whether to upload the compile-time SDK package, `true` by default

Field-by-field details live in the [API Reference](/projects/haskinproxy/api).

## Relationship With Other Projects

- **Consumes** [HRPAuth](/projects/hrpauth/) as the upstream Yggdrasil service, reached through its `/yggdrasil-api` prefix
- **Registers** with HRPAuth through `POST /services/presence`, `POST /services/relay`, and `POST /services/sdk-packages`
- **Depends on** [HA-Contract](/projects/ha-contract/) for the microservice extension and SDK package contracts
- **Is consumed by** Minecraft clients running CustomSkinLoader, and by the [HRPAuth Web UI](/projects/hrpauth-web/), which renders the SDK package
- **Sits beside** [HASkinLib](/projects/haskinlib/), which stores and serves the textures the upstream exposes

## Related Pages

- [Architecture](/projects/haskinproxy/architecture): how a profile becomes a CSL response, and how the cache and the upstream handshake work
- [API Reference](/projects/haskinproxy/api): the four endpoints, their payloads, and their error format
- [HRPAuth](/projects/hrpauth/): the upstream service and the `/services/*` extension layer
