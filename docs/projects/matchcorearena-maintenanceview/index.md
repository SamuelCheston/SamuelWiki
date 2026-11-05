# MatchCoreArena MaintenanceView

MatchCoreArena MaintenanceView is the operator desktop console for the MatchCoreArena platform. It is a Wails application that inspects users and matches, simulates rating changes, and manages configuration backups, all through the maintenance SQL channel of the server.

## What It Covers

- A dashboard with the user count and the active match count
- A user browser with a direct rank score edit
- A match manager that can upload a result by hand
- A rating simulator that runs the Elo formula locally
- A configuration manager with timestamped backups, history and restore
- A Redis key browser that is present in the UI but disabled at runtime

## Tech Stack

- Backend: Go 1.25, Wails v2.15
- Frontend: React 19, TypeScript, Vite 7, Material UI v9, recharts, lucide-react
- The MySQL and Redis drivers stay in `go.mod`, but the direct connections are disabled at runtime
- No HTTP server of its own, the only outbound call is the maintenance SQL request

## Directory Layout

```text
main.go                  # Wails bootstrap, window title MCA-Maintenance
app.go                   # the 11 methods bound to the frontend
wails.json               # Wails project settings
config.yaml              # runtime config, read as a relative path
internal/
  config/config.go       # LoadConfig and the default value constants
  logic/maintenance.go   # maintenance service, config backup and restore
  logic/rating.go        # local Elo simulation
  models/models.go       # shared data models
frontend/
  src/components/        # Dashboard, RedisBrowser, DatabaseManager, MatchManager, RatingSimulator, ConfigManager
  dist/                  # built assets, embedded into the binary
build/                   # packaging assets, bin/ holds MCA-Maintenance, config.yaml, config_history/
HA-Contract              # symlink to the shared contract repo
```

## Running It

### Prerequisites

- Go 1.25 and the Wails CLI
- Node.js and npm for the frontend
- a running [MatchCoreArena Server](/projects/matchcorearena-server/)
- a `config.yaml` in the working directory

### Build

```bash
wails build
```

### Run

```bash
./build/bin/MCA-Maintenance
```

For development:

```bash
wails dev
```

The Wails dev server listens on `http://localhost:34115`. The config file is read as a relative path, so the binary has to run in a directory that holds `config.yaml`. The shipped `build/bin/` directory contains a copy of it for exactly that reason.

There is no Makefile, no Dockerfile and no docker-compose in this repository.

## Configuration

`config.yaml` is read by `internal/config.LoadConfig`. When the file is missing the defaults are used instead, so the console starts even without a config file.

- `upstream_url`: the server address, the default is `https://arena.mcnb.dev/` (example default address)
- `management_token`: the operator credential, it must match the server side `auth.maintenance_token`
- `database.dsn`: the default is `root:@tcp(127.0.0.1:3306)/matchcorearena?parseTime=true`
- `redis.addr`, `redis.password`, `redis.db`: the Redis connection, direct access is disabled

The console makes exactly one backend call.

```http
POST https://arena.mcnb.dev/api/maintenance/sql
Authorization: Bearer <management_token>
Content-Type: application/json

{"sql": "SELECT COUNT(*) FROM users"}
```

The response envelope is parsed for `success` and `data`. The request timeout is 10 seconds.

Configuration changes are versioned by backup, not by a schema version.

- saving writes the old file to `config_history/config_<YYYYMMDD_HHMMSS>.yaml`
- the history list is the files in `config_history/` that start with `config_` and end with `.yaml`, newest first
- restoring copies a chosen backup over `config.yaml`, and backs up the current file once more as `config_before_restore_<YYYYMMDD_HHMMSS>.yaml`

## The Bound Methods

The frontend reaches the backend through 11 methods bound in `app.go`.

- `GetConfig`
- `GetRedisKeys(pattern)`
- `DeleteRedisKey(key)`
- `GetUsers`
- `UpdateUserRankScore(uid, score)`
- `SimulateRating(input)`
- `GetSystemStats`
- `UploadMatchResult(result)`
- `SaveConfig(cfg)`
- `GetConfigHistory()`
- `RestoreConfig(filename)`

## Current Status

These are the things to know before you rely on a button in the UI.

- `GetRedisKeys` and `DeleteRedisKey` return the error `direct redis access is disabled`. The Redis browser in the frontend cannot do anything
- `GetUsers`, `GetSystemStats`, `UpdateUserRankScore` and `UploadMatchResult` are all built on the maintenance SQL channel, and they build the SQL by string concatenation. `UpdateUserRankScore` sends `UPDATE users SET rank_score = %d WHERE uid = %d`
- `UploadMatchResult` inserts into `matches` with the columns `match_type`, `winner_uid`, `score_delta` and `created_at`. The `score_delta` column does not exist in the server schema, so this statement fails
- `SimulateRating` is a pure local computation, it never calls the server. Its weight constants match the server ones: `K` goes from `520` to `390` over the first 10 wins and is `190` afterwards, `W_round` is `1.00`, `1.05`, `1.15` or `1.25`, `W_streak` is `1.00`, `1.15` or `1.28` for wins and `1.00`, `0.85` or `0.73` for losses, and `W_perf` is clamped to `[0.95, 1.05]`
- The README is still the default Wails React TypeScript template text and contains no information about this project

## Relationship With Other Projects

- **Depends on** [MatchCoreArena Server](/projects/matchcorearena-server/) only, through `POST /api/maintenance/sql`
- **Has no direct call** to [BedwarsRel](/projects/bedwarsrel/) or [BedwarsRel-MCA](/projects/bedwarsrel-mca/). The match manager works on the `matches` and `users` tables that BedwarsRel-MCA has already reported into

## Related Pages

- [MatchCoreArena Server](/projects/matchcorearena-server/): the backend this console administers
- [MatchCoreArena Server Architecture](/projects/matchcorearena-server/architecture): the rating model and the maintenance channel
- [MatchCoreArena Client](/projects/matchcorearena-client/): the player facing client of the same platform
