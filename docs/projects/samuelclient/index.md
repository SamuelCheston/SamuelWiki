# SamuelClient

SamuelClient is a cross-platform Minecraft launcher built as a Wails desktop application. It handles offline and authlib-injector accounts, version and mod management, the download and launch flow, and it embeds a local HTTP API.

## What It Covers

- Offline accounts and authlib-injector (Yggdrasil) accounts with token refresh and validation
- Version browsing and downloading, plus Fabric and Forge loader versions
- Mod management for the active profile
- Java runtime tracking with a default per profile
- Launching the game with a configurable memory range, JVM arguments, and window size
- An embedded Gin API and an embedded SQLite database for users, settings, logs, tasks, file records, and Java installations

## Tech Stack

- Go 1.25 with Wails v2.12 for the desktop shell and the Go to JavaScript bindings
- Gin v1.10 for the embedded local API
- modernc.org/sqlite, a pure Go SQLite build, so no CGO is needed
- React 19, TypeScript, Vite 6, and Material UI v9 on the frontend
- External services: the Mojang API, BMCLAPI, the Fabric and Forge APIs, and an authlib-injector server

## Directory Layout

```text
app.go                       # Wails bindings and the Gin server startup
main.go                      # Wails bootstrap
wails.json                   # Wails project configuration
internal/config/             # SERVER_PORT and GIN_MODE
internal/database/           # SQLite setup, WAL mode, and the migrations
internal/handlers/           # handlers.go for generic and health routes, db_handlers.go for the table CRUD, mc_handlers.go for launcher work
internal/middleware/         # Recovery, Logger, and CORS
internal/repository/         # data access layer
internal/routes/             # Gin route assembly for /api/v1 and the legacy routes without a prefix
internal/services/           # services.go HTTPService, mc_services.go for authlib, BMCLAPI, Fabric, Forge, and the launcher, plus the Unix and Windows process detach implementations
frontend/src/components/     # HomeView, VersionManager, AccountManager, ModManager, SettingsView, DebugView, LoginView
frontend/src/variables.ts    # frontend defaults
build/                       # darwin and windows packaging assets
docs/                        # minecraft-launcher-standard.md, BMCLAPI.pdf, and the authlib-injector wiki
```

## Running It

### Prerequisites

- Go 1.25 or newer
- Node.js 18 or newer
- The Wails CLI, and `wails doctor` for an environment check
- Linux needs GCC, libgtk-3-dev, libwebkit2gtk-4.0-dev, and pkg-config
- macOS needs the Xcode Command Line Tools
- Windows needs MinGW-w64 or MSYS2, and the WebView2 runtime

### Build

```bash
wails build
```

The binary lands in `build/bin/` as `SamuelClient`, or `SamuelClient.exe` on Windows. Use `wails build -platform windows/amd64` to cross compile.

### Run

```bash
wails dev
```

The embedded Gin API listens on port 34501 by default, and the Vite dev server proxies `/api` to it.

There is no Makefile and no Dockerfile in this repository.

## Configuration

Environment variables read by the Go side:

- `SERVER_PORT`: port of the local API, default `34501`
- `GIN_MODE`: Gin mode, default `debug`

The SQLite database lives at `~/.hrpml/data.db` and is opened with `?_journal_mode=WAL&_busy_timeout=5000`. The connection pool is fixed at one connection. The `runMigrations` function creates the tables on the first start.

Frontend environment variables:

- `CMCL_PATH`: default `java -jar ./cmcl.jar`
- `SHELL_API_URL`: default `http://localhost:34501`
- `GAME_DIR`: default `~/.minecraft`

The frontend defaults the launcher memory to 2048M minimum and 4096M maximum. On the backend side an unset value falls back to 1024M minimum and 4096M maximum. `launcher.authlib_jar` in the settings table holds the path to the authlib-injector jar.

## Local API

Routes under `/api/v1`:

- `GET /health`, `GET /ping`, `GET /hello/:name`, `POST /echo`, `GET /sysinfo`
- `POST /shell/execute`, `POST /file/operation`
- `GET /db/stats`, `POST /db/cleanup`, `GET /db/schema`, plus CRUD for users, settings, logs, tasks, files, and java
- `GET /auth/meta`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/validate`, `POST /auth/offline`
- `GET /versions`, `GET /fabric/versions`, `GET /forge/versions`, `POST /download/version`
- `GET /launcher/config`, `PUT /launcher/config`, `POST /launcher/launch`, `GET /launcher/minecraft-dir`, `GET /launcher/installed-versions`

A set of legacy routes without the `/api/v1` prefix is kept for backward compatibility.

Wails binding methods: `Greet`, `TestHealthCheck`, `TestPing`, `TestAPICall`, `GetDBPath`, `GetDBSchema`.

## Relationship With Other Projects

- **Depends on** external standard services, namely Mojang, BMCLAPI, Fabric, Forge, and an authlib-injector server
- **Can point at** [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) when you want the launcher to use the HA account stack
- **Has no code coupling** with the three MatchCoreArena projects
- **Has no direct interface** with [BedwarsRel](/projects/bedwarsrel/)

### Legacy Naming

Several old names survive in the repository.

- The go module is still called `HRPMLW`
- The frontend package name is still `hrpml-ml`
- The README directory tree still shows `HRPML-Wails/`
- The README links still point at the absolute path `/home/lnb/HRPML-Wails/...`

## Related Pages

- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/): the authlib-injector compatible backend the launcher can use
- [MatchCoreArena Client](/projects/matchcorearena-client/): the other desktop client in the ecosystem
