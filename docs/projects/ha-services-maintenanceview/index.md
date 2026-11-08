# HA Services MaintenanceView

HA Services MaintenanceView is the browser-facing host of the HA deployment management WebUI. It serves the React frontend, proxies the Deployer — including its orchestration surface — and takes care of the first configuration of each service.

## What It Covers

- Serve the compiled React frontend from `frontend/dist`
- Proxy version and artifact queries to HA Services Deployer
- Proxy the Deployer's orchestration surface (manifests, validation, status, runs, deploy, rollback) with server-held deploy credentials; the browser never receives them
- Session login for operators, reusing the existing operations identity (the deploy token); login-free mode when no token is configured
- Keep per-project deployment settings (deploy directory, port) in a local JSON file
- Merge the remote manifest with the local deployment state into one project list
- Initialize a service by running its binary and rewriting the generated YAML

## Tech Stack

- Backend: Go 1.25, Gin, goccy/go-yaml, `os/exec` to invoke the target binary
- Frontend: React 19, TypeScript, Vite 7, no UI library and no router; the UI lives in a small set of views (`App.tsx`, `BootstrapView.tsx`, `OrchestrationView.tsx`)
- No database, the state stays in `data/projects.json`

## Directory Layout

```text
main.go                            # entry point, wires config, deployer client, state store, router
internal/config/                   # config load, save, version migration
internal/models/                   # Config, project settings and remote project models
internal/deployer/client.go        # Deployer HTTP client, 10s timeout, unwraps the envelope data
internal/state/store.go            # local projects.json read and write
internal/server/router.go          # route registration and the static file fallback
internal/server/handlers.go        # request handlers
internal/server/bootstrap_specs.go # default port and config fields per project
internal/server/bootstrap_runtime.go # run the binary, generate the config, rewrite the YAML
frontend/                          # React source and the dist output
```

## Running It

### Prerequisites

- A running [HA Services Deployer](/projects/ha-services-deployer/), it must be started first
- Go 1.25 for the backend
- Node.js and npm for the frontend
- A built frontend, otherwise the backend cannot serve the UI

### Build

Backend:

```bash
go build -o ./build/hasmv .
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

### Run

Backend:

```bash
go run .
```

Frontend development server:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server listens on port `5173` and proxies `/api` and `/healthz` to the backend.

The listen port is defined in several places. The code default is `:2771`, while the shipped `config.yaml` and the Docker image use `:18081`. The Vite dev proxy targets `http://127.0.0.1:18081`, so the backend has to run on that port during frontend development.

## Configuration

Copy `config.example.yaml` to `config.yaml`. The default file is written on startup when it is missing, and an older version is migrated step by step.

- `version`: config schema version
- `server.listen`: listen address, the code default is `:2771`
- `server.public_base_url`: the address the browser uses to reach this service
- `server.frontend_dist`: directory of the built frontend, `./frontend/dist`. A missing directory makes the service answer `503` and tell you to build the frontend first
- `deployer.base_url`: the Deployer address, `http://127.0.0.1:18080`
- `deployer.token`: the Deployer deploy credential, reused as the panel login password. It stays server-side: the proxy injects it into outbound mutation requests. When empty, the panel keeps the legacy login-free behavior and deploy/rollback triggers fail closed (503)
- `state.projects_path`: path of the local settings file, `./data/projects.json`

A port must be between 1 and 65535 and must be unique across all projects. The uniqueness check covers the projects saved locally and the projects reported by the Deployer.

## HTTP API

- `GET /healthz`
- `GET /api/healthz`
- `GET /api/session` · `POST /api/session/login` · `POST /api/session/logout`
- `GET /api/config` (redacted: never returns token material)
- `GET /api/projects`: the remote manifest merged with the local deployment settings
- `PUT /api/projects/:name/deployment`: save the deploy directory and the port
- `POST /api/projects/:name/precheck`: check the deploy directory and the port before initializing
- `POST /api/projects/:name/initialize`: generate the first configuration
- `GET /api/deployer/healthz`
- `GET /api/deployer/manifest`
- `GET /api/request-log`
- `GET /api/orchestration/manifest` · `GET /api/orchestration/validation` · `GET /api/orchestration/status`
- `GET /api/orchestration/runs` · `GET /api/orchestration/runs/:id`
- `POST /api/orchestration/deploy` · `POST /api/orchestration/rollback`

Routes registered after the session middleware require a valid session when `deployer.token` is configured. The orchestration shapes proxied here follow the Deployer's orchestration contract; when `deployer.token` is unset the mutation routes answer 503.

Any path that matches no route is looked up in `frontend/dist` as a static file, and falls back to `index.html` so the single-page frontend can handle its own routing.

## Orchestration Area

What the orchestration area shows is decided by the projects' `deploy-manifest.yaml` declarations, aggregated from the Deployer:

- The project list is exactly the aggregated manifests; manifest load errors are surfaced verbatim as a warning banner, not hidden.
- A project counts as deployable purely by its manifest declaration: Tinyvisor-managed and not of external kind (`frontend/src/api.ts::isDeployable`). Panel-managed, manually managed, and external entries stay visible as read-only facts.
- No manifest declarations means an empty orchestration area; nothing is invented client-side.

## Initialization Support

`bootstrap_specs.go` currently registers three projects.

- `hrpauth`, default port `2778`
- `hrpauth-yggdrasil-api`, default port `2770`
- `haskinproxy`, default port `2702`

Initialization runs the downloaded binary so that it writes its own default configuration, then rewrites the listen address, the self URL fields and the dependency URLs inside that YAML. Projects outside this list are shown in the UI but cannot be initialized.

## Relationship With Other Projects

- **Depends on** [HA Services Deployer](/projects/ha-services-deployer/) through `deployer.base_url`
- **Is unrelated to** the HRPAuth microservice extension layer
- **Initializes** [HRPAuth](/projects/hrpauth/), [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) and [HASkinProxy](/projects/haskinproxy/), so it knows their config file names, default ports and cross-service URL fields

## Related Pages

- [Operations Panel](/game/operations-panel): operator-facing view of this service
- [HA Services Deployer](/projects/ha-services-deployer/): the manifest and artifact backend it proxies
- [HRPAuth](/projects/hrpauth/): one of the projects it can initialize
- [HASkinProxy](/projects/haskinproxy/): one of the projects it can initialize
