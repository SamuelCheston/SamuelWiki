# MatchCoreArena Server

MatchCoreArena Server is the central backend of the MatchCoreArena competitive platform. It manages users, friends, teams, matches and leaderboards, and it is the only authoritative place where Elo rating changes are settled.

## What It Covers

- User profiles, experience and rank score
- Friend requests and the friend list
- Teams and team membership
- Match reporting and per-user match history
- Leaderboards by rank type and season
- An operator SQL channel for maintenance work

## Tech Stack

- Go 1.26.4, Gin v1.12
- MySQL through `go-sql-driver/mysql`
- Redis through `go-redis/v9`
- `goccy/go-yaml` for the config file, `google/uuid` for request IDs
- Docker multi-stage build, the image exposes `9178`
- [HRPAuth](/projects/hrpauth/) as the OAuth2 identity provider and the transparent auth proxy

## Directory Layout

```text
api/                # router.go plus the HTTP layer
  router.go         # route registration and dependency wiring
  handler/          # auth, user, friend, team, match, ranking, maintenance
  middleware/       # request_id, recovery, auth
config/             # versioned config loading, validation and migration
  config.yaml       # runtime config
  config.example.yaml
  tokens.yaml       # high privilege service credentials
internal/
  apperr/           # business error codes
  auth/             # HRPAuth client and token verification
  rating/           # the Elo algorithm
  response/         # the unified response envelope
  service/          # business logic
migrate/            # embedded SQL migrations
  embed.go
  migrations/baseline.sql
  migrations/20260918_add_match_participants.sql
redis/              # Redis client
build/              # prebuilt binary mca
HA-Contract         # symlink to the shared contract repo
bwrel.md            # research notes on the BedwarsRel-MCA statistics mechanism
main.go
Dockerfile
```

## Running It

### Prerequisites

- MySQL
- Redis
- a reachable HRPAuth instance
- a writable working directory for `config/config.yaml` and `config/tokens.yaml`

### Build

```bash
go build -o build/mca .
```

### Run

```bash
./build/mca
```

The startup order is fixed: load the config, run the migrations, connect to MySQL, connect to Redis, initialize the HRPAuth client, load `config/tokens.yaml`, then start Gin.

The default listen address is `0.0.0.0:9178`. The Docker image exposes the same port.

The repository has no README and no Makefile, so the commands above are the whole build story.

## Configuration

`config/config.yaml` is created with defaults when it is missing, and migrated step by step when the file version is older than the binary. The `CONFIG_PATH` environment variable overrides the file path.

- `version`: the config schema version, the code currently supports `1.4.0`
- `server`: listen address and the read and write timeouts
- `database`: the MySQL connection and the pool sizes
- `redis`: the Redis connection
- `auth.hrpauth`: the HRPAuth base URL and the OAuth2 public client ID
- `auth.maintenance_token`: the operator super credential

`config/tokens.yaml` is a separate file for high privilege service credentials. It is generated on first load and holds a `super-admin` entry and a `match-reporter` entry.

See [Configuration](/projects/matchcorearena-server/configuration) for the field-by-field details.

## Relationship With Other Projects

- **Consumes** [HRPAuth](/projects/hrpauth/) as the OAuth2 identity provider, and proxies the login, TOTP, refresh and revoke calls to it
- **Is consumed by** [MatchCoreArena Client](/projects/matchcorearena-client/) and [MatchCoreArena MaintenanceView](/projects/matchcorearena-maintenanceview/)
- **Receives match reports from** [BedwarsRel-MCA](/projects/bedwarsrel-mca/), which posts to `/api/matches` with the `match-reporter` credential
- **Shares the contract** with [HA-Contract](/projects/ha-contract/) through the `HA-Contract` symlink

## Related Pages

- [Architecture](/projects/matchcorearena-server/architecture): how a request travels through the service and how a rating change is settled
- [Configuration](/projects/matchcorearena-server/configuration): the versioned config reference, the migration chain and the service credentials
- [MatchCoreArena MaintenanceView](/projects/matchcorearena-maintenanceview/): the operator console that talks to the maintenance SQL channel
