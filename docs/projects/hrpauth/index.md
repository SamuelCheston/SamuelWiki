# HRPAuth

HRPAuth is the core authentication service of the HA ecosystem. A single binary serves both the OAuth2 business APIs and the Yggdrasil API.

## What It Covers

- OAuth2 authorization for the Web UI and for third-party clients
- Yggdrasil authentication, sessions, profiles, and textures
- Account registration, email verification, TOTP, and WebAuthn passkeys
- Texture upload and distribution
- A microservice extension layer for satellite services

## Tech Stack

- Go 1.26+, Gin, GORM
- MySQL for accounts, sessions, and tokens
- Redis for captchas, verification codes, and rate limiting

## Directory Layout

```text
main.go        # entry point, route registration, background tasks
config/        # config loading and versioned migration
controllers/   # HTTP handlers
services/      # business logic
models/        # GORM models
database/      # connection and SQL migrations
redis/         # Redis client
registry/      # service presence and heartbeat worker
utils/         # shared helpers
build/         # prebuilt binaries and the runtime config
```

## Running It

### Prerequisites

- MySQL
- Redis
- a writable working directory for `config.yaml` and the signing key files

### Build

```bash
go build -o ./build/hrpauth
```

### Run

```bash
./build/hrpauth
```

The first run generates `config.yaml`, applies the database migrations, creates the signing key pair, and starts the HTTP server on `:2778`.

## Configuration

`config.yaml` is created with defaults on first run and migrated step by step when the file version is older than the binary expects.

- `site`: service name and version shown in the metadata
- `server`: listen port and CORS origin
- `database`: MySQL connection
- `redis`: Redis connection and key prefix
- `smtp`: mail delivery for email verification
- `security`: captcha, password cost, rate limits
- `oauth2`: issuer, clients, token TTLs
- `yggdrasil`: metadata, signing keys, texture limits, feature flags

See [Configuration & API](/projects/hrpauth/configuration) for the field-by-field details.

## Relationship With Other Projects

- **Consumes** [HA-Contract](/projects/ha-contract/) as the source of truth for its business API
- **Provides** the `/services/*` extension layer used by [HASkinProxy](/projects/haskinproxy/), [HA Services Deployer](/projects/ha-services-deployer/), and [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/)
- **Shares** its MySQL database with [HASkinLib](/projects/haskinlib/), so schema changes must be coordinated
- **Is consumed** by [HRPAuth Web](/projects/hrpauth-web/) and [HRPAuth Spigot](/projects/hrpauth-spigot/)

## Related Pages

- [Architecture](/projects/hrpauth/architecture): how a request travels through the service
- [Configuration & API](/projects/hrpauth/configuration): the full configuration reference and route groups
- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/): the standalone Yggdrasil deployment
