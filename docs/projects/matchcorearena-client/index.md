# MatchCoreArena Client

MatchCoreArena Client is the cross-platform desktop client of the MatchCoreArena service. It gives you a graphical interface for login, friends, teams, rankings, and match history.

## What It Covers

- Account login with TOTP verification, token refresh, and logout
- Friend list with send, accept, reject, and delete
- Team creation, member roles, and disbanding
- Season rankings, both the top list and your own rank
- Match result reporting and your own match history
- No local database and no middleware, every operation is an HTTP call to the server

### Backend Routes And Bindings

The frontend never talks HTTP directly. It calls the Go methods bound by Wails, and those methods forward to the service layer.

- Auth: `/api/auth/login-ticket`, `/api/auth/totp-verify`, `/api/auth/refresh`, `/api/auth/logout`
- Users: `/api/users/me`, `/api/users/{uuid}`, `/api/users/me/experience`
- Friends: `/api/friends`, `/api/friends/{id}/accept`, `/api/friends/{id}/reject`, `/api/friends/{id}`
- Teams: `/api/teams`, `/api/teams/{id}`, `/api/teams/{id}/members`, `/api/teams/{id}/members/{uuid}/role`
- Matches: `/api/matches`, `/api/matches/{id}`, `/api/matches/me`
- Rankings: `/api/rankings/{type}`, `/api/rankings/me`

Every request carries `Content-Type: application/json` and, once a token is set, `Authorization: Bearer <token>`. The HTTP client times out after 10 seconds.

## Tech Stack

- Go 1.25 with Wails v2.15 for the desktop shell and the Go to JavaScript bindings
- React 19, TypeScript, Vite 6, Material UI v9, and ESLint 9 on the frontend
- The client holds no persistent state of its own, it reads `config.json` and delegates everything else to the server

### Known Inconsistencies

The README has drifted away from the code in three places.

- The README says MIT, `package.json` declares `AGPL-3.0` and `LICENSE` is the AGPL text
- The README tech table says Material UI v6, the actual dependency is v9
- The README tech table says Gin, `go.mod` has no Gin dependency and the code never uses it

## Directory Layout

```text
app.go                       # Wails binding methods, one per business action
main.go                      # Wails bootstrap and frontend asset embedding
wails.json                   # Wails project configuration
Makefile                     # dev, build, install, and check targets
start.sh                     # environment check, dependency install, first run setup
config.example.json          # template for ~/.matchcorearena/config.json
Dockerfile                   # container image for the desktop binary
docker-compose.yml           # container run definition
internal/config/             # reads and writes ~/.matchcorearena/config.json
internal/handlers/app.go     # aggregation layer, forwards calls to the services
internal/models/             # auth, common, friend, match, ranking, team, and user models
internal/services/           # HTTP client layer, api.go base class plus one service per domain
frontend/src/                # LoginView, HomeView, FriendList, RankingView, and the drawer navigation in App.tsx
frontend/wailsjs/            # Wails generated Go to JavaScript bindings
build/                       # build assets, the product lands in build/bin/
.github/workflows/           # build.yml, codeql.yml, and release.yml
```

## Running It

### Prerequisites

- Go 1.25 or newer
- Node.js 18 or newer
- The Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Build

```bash
make install
make build
```

`make install` runs `go mod tidy` and installs the frontend packages. `make build` runs `wails build` and writes the binary to `build/bin/MatchCoreArenaClient`.

### Run

```bash
./start.sh
```

`start.sh` checks Go, Node, and the Wails CLI, installs the CLI when it is missing, creates `~/.matchcorearena/config.json` from the template on the first run, and then starts `wails dev`.

The desktop application owns no port. The Vite dev server runs on 5173 with `strictPort` enabled.

CI runs `go test ./...`, `npm run typecheck`, `npm run lint`, `npm run build`, and `wails build`.

## Configuration

The client keeps its settings in `~/.matchcorearena/config.json`. The template lives in `config.example.json`.

- `server_url`: base URL of the MatchCoreArena server, default `https://arena.mcnb.dev/`
- `debug`: debug flag, default `false`

`.env.example` and `docker-compose.yml` also declare `SERVER_URL` and `DEBUG`. The loader in `internal/config/config.go` reads the JSON file only, so those two variables do not reach the application in the current build.

## Relationship With Other Projects

- **Depends on** [MatchCoreArena Server](/projects/matchcorearena-server/) as its only backend
- **Has no direct link to** [BedwarsRel](/projects/bedwarsrel/), Bedwars results reach the rankings and the match history only after the server has stored them in MySQL
- **Consumes** [HA-Contract](/projects/ha-contract/) as the source of truth for the business API it calls

## Related Pages

- [MatchCoreArena Server](/projects/matchcorearena-server/): the service behind this client
- [HA-Contract](/projects/ha-contract/): the contract every business route must follow
