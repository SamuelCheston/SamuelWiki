# HA WebUI SDK Handler

HA WebUI SDK Handler is the compile-time SDK aggregator of the frontend. It pulls the SDK source packages from the HRPAuth main service, injects them into the frontend template, compiles the result and publishes the static artifacts.

## What It Covers

- Poll the SDK package list of the HRPAuth main service with an ETag based incremental request; the ETag is a sha256 fingerprint of the whole list
- Download the SDK source archives only when the list ETag changed, and unpack them into a fresh per-build work directory
- Generate the SDK manifest, routes, navbar, dashboard and profile card files for the frontend
- Merge the SDK dependencies into the template `package.json`
- Run `npm install`, `tsc -b` and `vite build` under a timeout, then publish the artifacts by replacing the artifacts directory

## Tech Stack

- Go 1.25, Gin, yaml.v3
- Node.js, npm and git are needed at runtime, the build itself happens in the frontend toolchain
- No database, the build history lives in `state/builds.json`

## Directory Layout

```text
main.go                      # single-file main program: routes, polling loops, build orchestration
internal/config/             # config load, v3 to v4 migration, atomic save and backup
internal/broker/broker.go    # HRPAuth client: OAuth2 token, ETag polling of /services/sdk-packages
internal/inject/             # unpack, path safety, dependency merge, generated frontend files
internal/build/build.go      # npm install, tsc -b, vite build
internal/publish/publish.go  # publish of the build artifacts (temp copy + directory replace)
internal/state/state.go      # build history
```

There is no `frontend/` directory in this repository. The frontend template is an external repository, `build.template_git_url` points at HRPAuth-WebUI by default, and it is cloned into `build.template_dir` at runtime.

The injection step writes these files into the template before the compilation:

```text
sdk-manifest.ts
sdk-routes.tsx
sdk-navbar.tsx
sdk-dashboard.tsx
sdk-critical-operations.ts
sdk-profile-cards.tsx
```

## Running It

### Prerequisites

- A running [HRPAuth](/projects/hrpauth/) main service with an Ops level OAuth2 client
- The frontend template repository, cloned automatically when the template directory is empty
- Node.js, npm and git
- A writable work directory and artifacts directory

### Build

```bash
go build -o ./build/sdkhandler .
```

### Run

```bash
./sdkhandler
```

The main service listens on `:2704` and the maintenance service on `:2705`. The configuration path defaults to `./config.yaml` and can be overridden with the `SDKHANDLER_CONFIG` environment variable.

## Configuration

- `version`: config schema version, currently `4`
- `server.listen_addr`: main listen address, `:2704`
- `server.maintenance_addr`: maintenance listen address, `:2705`
- `hrpauth.base_url`: HRPAuth main service address, `http://127.0.0.1:2778`
- `hrpauth.client_id`: OAuth2 client id, required, the service refuses to start without it
- `hrpauth.client_secret`: OAuth2 client secret, required
- `hrpauth.poll_interval_seconds`: SDK list polling interval, `60`
- `hrpauth.internal_key`: value the service requires in the `X-Internal-Key` header on every `/api/*` route of the main port. Empty means fail-closed: those routes answer `401`, while `/health` stays open
- `build.template_dir`: path of the frontend template
- `build.template_git_url`: template repository, cloned when the template directory is empty
- `build.work_dir`: working directory; every build gets a fresh `run-<build-id>` subdirectory under it
- `build.artifacts_dir`: the published artifacts directory; publishing replaces it in place, no per-build history is kept
- `build.current_link`: pointer to the currently published artifacts, used by `/api/revision` and the static hosting
- `build.npm_command`: npm executable, `npm`
- `build.ignore_scripts_default`: install with `--ignore-scripts` unless a package declares otherwise, `true`
- `build.npm_blacklist`: exact package names, a hit makes the build fail
- `build.template_poll_interval_seconds`: automatic template pull interval, `0` disables it
- `build.build_timeout_seconds`: overall build timeout, `1200`
- `state_dir`: state directory, holds `builds.json` and the download cache
- `serve_artifacts`: serve the published artifacts from this service, off by default. With the default off, this service only exposes the API and the published artifacts are hosted by an external web server

Relative paths are resolved against the directory of the configuration file, not the working directory. The example file and the code defaults disagree on `build.artifacts_dir` and `build.current_link`, so check the file you actually ship.

## Build Pipeline

- A build only starts when the polled list ETag changed (or when a build is forced through `/api/build/trigger`); an unchanged list skips the download and the build entirely
- Every build runs in its own context: a fresh `run-<build-id>` directory under `build.work_dir`. The template is copied in full into it, the template itself stays read-only
- The SDK archives are downloaded into the state directory cache, checked with sha256, and unpacked into that work directory with a path check that rejects entries escaping the target directory
- The SDK dependencies are deep-merged into the template `package.json`
- The build runs `npm install`, then `tsc -b` and `vite build`, or the template `build` script when it declares one
- A dependency that hits `build.npm_blacklist` fails the build, regardless of the script policy
- Publishing copies `dist` into a temporary directory next to the target, deletes the old artifacts directory and renames the temporary one into its place. A failed build never touches the published artifacts, but between the delete and the rename there is a short window in which the artifacts directory does not exist; the external web server serving it must tolerate that moment

## HTTP API

Main port:

- `GET /health`
- `GET /api/build/status`
- `POST /api/build/trigger`
- `GET /api/revision`

Every `/api/*` route on the main port requires the `X-Internal-Key` header to match `hrpauth.internal_key`; with an empty configured key they all answer `401` (fail-closed). Only `/health` is exempt.

With `serve_artifacts` enabled the service also serves the published artifacts.

Maintenance port, every route requires an Ops level bearer token:

- `POST /api/maintenance/template/pull`
- `GET /api/maintenance/sdk/list`

## Relationship With Other Projects

- **Is the only consumer** of the `/services/sdk-packages` endpoints of the [HRPAuth](/projects/hrpauth/) extension layer
- **Does not use** `/services/presence` and `/services/relay`, those belong to [HASkinProxy](/projects/haskinproxy/), [WinnerProxy](/projects/winnerproxy/) and [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/)
- **Trusts** the main service only, it never talks to a satellite service directly
- **Builds** the frontend template, which lives in the external HRPAuth-WebUI repository

## Related Pages

- [HRPAuth](/projects/hrpauth/): the only SDK source it talks to
- [HRPAuth Web](/projects/hrpauth-web/): the frontend whose template it compiles
- [HA Contract](/projects/ha-contract/): the SDK package contract
