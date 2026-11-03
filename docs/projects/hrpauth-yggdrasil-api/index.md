# HRPAuth Yggdrasil API

HRPAuth-Yggdrasil-API is a standalone Minecraft authentication service that speaks the Yggdrasil protocol. It serves sessions, profiles, and textures to game clients and authlib-injector, and it reaches the HRPAuth core over OAuth2 for account verification.

## What It Covers

- Yggdrasil authentication, token refresh, and session join for game clients
- Game accounts and Minecraft profiles bound to a core account
- Skin and cape storage, served through signed `textures` profile properties
- Mojang account binding and game profile creation for the Web UI
- A WebUI SDK package that adds the Yggdrasil pages to the core WebUI

## Tech Stack

- Go 1.26.4, Gin v1.12
- GORM with MySQL as the primary store; the module also carries a sqlite driver
- golang-migrate for schema migrations, go-redis/v9 for rate limits and caching
- golang.org/x/oauth2 client credentials for the HRPAuth core
- HugoSmits86/nativewebp for WebP texture previews
- RSA key pairs from `crypto/rsa` for signing texture properties

## Directory Layout

```text
main.go        # entry point, route registration, background tasks
config/        # config parsing, versioned migration, runtime metadata
controllers/   # Yggdrasil, register, proxy, player, and cleanup handlers
services/      # auth, player, texture, profile key, skin avatar, bind timeout
clients/       # HTTP client for the HRPAuth core
utils/         # core API client and shared helpers
models/        # GORM models
database/      # connection and SQL migrations
redis/         # Redis client
sdk/           # embedded WebUI SDK package
build/         # the built binary
```

## Running It

### Prerequisites

- MySQL, with the database and the user created in advance
- Redis
- a running HRPAuth core for account verification and WebUI integration
- a writable directory next to the binary for `config.yaml` and the key pair

Without a core, only internally registered proxy accounts can authenticate.

### Build

```bash
./build.sh
```

`build.sh` is equivalent to `go build -o ./build/HAygg`.

### Run

```bash
./build/HAygg
```

The first run writes `config.yaml` and an RSA key pair (`public_key.pem` and `private_key.pem`) next to the binary, applies the database migrations, and listens on `:2770`.

Check that it answers:

```bash
curl http://localhost:2770/
```

The response is JSON and contains `"status": "online"`.

The Docker image ships without a `config.yaml`. Mount yours at `/app/config.yaml`, or set `CONFIG_TEMPLATE` and `RENDERED_CONFIG` to render the file from an envsubst template at container start. Textures go to `/app/storage`.

## Configuration

`config.yaml` lives in the same directory as the binary. It is generated with defaults on the first run. When its `version` is older than the binary supports, the file is backed up and migrated step by step up to the current version, which is `3`.

- `server`: listen port and CORS origin
- `site`: the name and version shown in the metadata
- `callback`: the public base URL used to build texture URLs
- `core_api`: the core address and the OAuth2 client credentials
- `database`: the MySQL connection and the table prefix
- `redis`: the Redis connection and the key prefix
- `microservice`: the service name, heartbeat TTL, relay URL, and relay path prefix
- `yggdrasil`: metadata, security limits, and feature flags
- `security`: login rate limit settings

This service has no separate configuration page. `config.yaml` and `config/config.go` in the repository are the reference.

## Relationship With Other Projects

- **Depends on** [HRPAuth](/projects/hrpauth/) for account verification, OAuth2 tokens, and site metadata
- **Registers itself** as a microservice, so the core relays `/yggdrasil-api` traffic to it
- **Delivers** a WebUI SDK package that [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/) aggregates into the WebUI build
- **Serves** the upstream routes that [HASkinProxy](/projects/haskinproxy/) calls
- **Follows** the contract defined in [HA-Contract](/projects/ha-contract/)

## Related Pages

- [Architecture](/projects/hrpauth-yggdrasil-api/architecture): how a request travels through the service
- [API Reference](/projects/hrpauth-yggdrasil-api/api): the protocol endpoints, the business endpoints, and the error shapes
