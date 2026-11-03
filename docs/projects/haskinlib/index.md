# HASkinLib

HASkinLib is the skin and cape library of the HA ecosystem. It takes PNG texture uploads, generates WebP previews, serves paginated listings, and hands out the original files through a small standalone HTTP API.

## What It Covers

- PNG skin and cape uploads with dimension validation
- WebP preview generation at upload time
- Paginated preview listings with type, tag, and order filters
- Public preview and original file endpoints for game clients
- Deletion limited to the textures of the caller

## Tech Stack

- Go 1.25, Gin v1.12
- GORM and MySQL for the two texture list tables
- golang-migrate for schema migrations
- goccy/go-yaml for configuration
- nativewebp for in-process WebP encoding
- golang.org/x/oauth2 clientcredentials for the HRPAuth core API
- MySQL only, no Redis

## Directory Layout

```text
main.go        # entry point, route registration, CORS and request ID middleware
config/        # configuration loading and versioned migration
controllers/   # HTTP handlers
services/      # upload, deletion and upload rate limiting logic
models/        # GORM models for the skin and cape texture lists
database/      # database connection and SQL migrations
clients/       # HRPAuth core API client
utils/         # OAuth2 clientcredentials wrapper for the core API
docs/          # skinlib-api.md interface reference
build/         # prebuilt binary
```

## Running It

### Prerequisites

- MySQL, with a database dedicated to HASkinLib
- A running HRPAuth core API
- An OAuth2 client on HRPAuth that HASkinLib can use
- A writable working directory for `config.yaml` and the texture files

### Build

```bash
go build -o ./build/hasl
```

`./build.sh` runs the same command.

### Run

```bash
./build/hasl
```

The default listener is `:2701`. The first run writes `config.yaml`, creates `./data/textures` and `./data/previews`, applies the database migrations, and creates the `texture_list_skin` and `texture_list_cape` tables under the `hasl_` prefix.

## Configuration

`config.yaml` lives in the working directory. The first run writes the defaults and stamps `version: "6"` into the file. An older file is migrated one version at a time, and the original is copied to `config.yaml.bak.<version>` before the migration starts.

- `server`: listen port and CORS origin
- `database`: MySQL connection and the table prefix
- `core_api`: HRPAuth base URL and OAuth2 client credentials
- `textures`: storage directories, size limits, and the upload rate limit

The `textures` block also constrains the upload interface. See [API](/projects/haskinlib/api) for the limits and the error codes they produce.

## Relationship With Other Projects

- **Depends on** [HRPAuth](/projects/hrpauth/) for every identity decision, through the core API
- **Is used by** [HRPAuth Web](/projects/hrpauth-web/) for the skin library pages: upload, listing, pull, preview, and delete
- **Serves** game clients through the public preview and pull endpoints
- **Shared** the HRPAuth database in an early version, and now runs against a dedicated one

## Related Pages

- [Architecture](/projects/haskinlib/architecture): the layers, the upload and preview pipeline, and the move to a dedicated database
- [API](/projects/haskinlib/api): endpoints, request shapes, error codes, and size rules
