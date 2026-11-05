# HA Services Deployer

HA Services Deployer is the version manifest and artifact delivery backend for the HA platform. It tells the operations frontend which service releases exist and which binary to download, in a machine-readable form.

## What It Covers

- A version manifest listing every service release and its artifacts
- Artifact download from a local storage directory
- A small read-only HTTP API for the operations frontend
- Manifest validation before any data is served
- Nothing beyond that: no deployment, no process control, no configuration rendering

## Tech Stack

- Go 1.25, Gin, goccy/go-yaml
- No database and no middleware, the filesystem is the only storage
- Docker multi-stage build, the runtime image runs as a non-root user

## Directory Layout

```text
main.go              # entry point, loads config.yaml, starts the HTTP server
internal/config/     # config load, save, auto-generation, version migration
internal/models/     # Config and Manifest v1 schema, validation rules
internal/server/     # route registration and request handlers
data/                # runtime data: manifest.json and artifacts/
examples/            # manifest.v1.json sample
deploy/              # docker-compose and per-service config templates
build/               # compiled output
```

## Running It

### Prerequisites

- Go 1.25 toolchain
- A writable `data/` directory
- No database, no external service

### Build

```bash
go build -o ./build/hasd .
```

### Run

```bash
go run .
```

The service only reads local files.

The listen port is defined in two places and they do not agree. The code default is `:2770`, and the Docker template plus compose file use `:18080`. Pick one and keep it consistent with the `deployer.base_url` of the MaintenanceView.

## Configuration

The service auto-generates `config.yaml` with defaults on first start, and migrates it when the version is older than the binary expects.

- `version`: config schema version
- `server.listen`: listen address, the code default is `:2770`
- `storage.artifacts_root`: root of the artifact storage, `./data/artifacts`
- `manifest.path`: path of the manifest file, `./data/manifest.json`

The manifest itself is a JSON file following schema v1.

```json
{
  "schema_version": 1,
  "generated_at": "2026-10-17T06:00:00Z",
  "services": [
    {
      "name": "hrpauth",
      "display_name": "HRPAuth",
      "channel": "stable",
      "version": "1.0.0",
      "published_at": "2026-10-17T05:45:00Z",
      "artifacts": [
        {
          "id": "linux-amd64-binary",
          "role": "binary",
          "os": "linux",
          "arch": "amd64",
          "file_name": "HRPAuth",
          "download_path": "release/linux-amd64/HRPAuth",
          "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          "size_bytes": 28753920
        }
      ]
    }
  ]
}
```

The manifest is validated before it is returned. Service names must be unique and lowercase, artifact ids must be unique inside a service, `role` must be one of `binary`, `archive` or `asset`, `sha256` must be a lowercase 64-character hex string, and `download_path` must stay inside the service artifact root.

## HTTP API

Every response uses the envelope `{success, message, data}`.

- `GET /healthz`
- `GET /api/v1/healthz`
- `GET /api/v1/manifest`: the whole manifest
- `GET /api/v1/projects`: the manifest reduced to the binary artifacts
- `GET /api/v1/artifacts/:service/*filepath`: download one artifact

The artifact path goes through `filepath.Clean` and a `..` prefix check before the file is opened, so a request cannot walk out of the service artifact root.

## Relationship With Other Projects

- **Is consumed by** [HA Services MaintenanceView](/projects/ha-services-maintenanceview/) through its `deployer.base_url`
- **Does not use** the HRPAuth microservice extension layer, it only reads its own `data/manifest.json`
- **Follows** the version manifest contract in [HA Contract](/projects/ha-contract/), documented at `docs/dev/HA-Services-Deployer/version-manifest.md`
- Manifest v1 explicitly does not cover first-deployment initialization or config template rendering

## Related Pages

- [Container Orchestration](/projects/ha-services-deployer/container-orchestration): the Compose template that runs the whole platform
- [HA Services MaintenanceView](/projects/ha-services-maintenanceview/): the frontend that consumes this manifest
- [HA Contract](/projects/ha-contract/): the version manifest contract
- [HRPAuth](/projects/hrpauth/): one of the services a manifest can describe
