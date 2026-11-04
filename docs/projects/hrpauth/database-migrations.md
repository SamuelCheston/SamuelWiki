# Database Migrations

Database schema is managed by SQL migrations ([golang-migrate](https://github.com/golang-migrate/migrate) format in `database/migrations/`); `AutoMigrate` is **not** executed at startup.

## Layout and Entry Point

- Entry point: `go run ./cmd/migrate ...` from the repository root (reuses the `database.*` settings of `config.yaml`).
- `000001_baseline` is the squashed core schema (`users`, `oauth2_clients`, `oauth2_authorization_codes`, `oauth2_access_tokens`, `oauth2_refresh_tokens`, `deleted_accounts`, `webauthn_credentials`). The historical steps `000002`–`000012` were squashed into the baseline on 2026-10-14 (`b8a745c`). Minecraft-specific tables live in HRPAuth-Yggdrasil-API (`000001_init`).

## Commands

```bash
go run ./cmd/migrate version   # current migration version and dirty state
go run ./cmd/migrate status    # same as version
go run ./cmd/migrate up        # apply all unapplied migrations
go run ./cmd/migrate up 1      # apply only N steps
go run ./cmd/migrate down      # rollback 1 step (down N for N steps)
go run ./cmd/migrate force 1   # mark the version without executing SQL
```

For a brand-new database run `go run ./cmd/migrate up`, then verify with `status`.

## Rules

- Application startup never modifies tables; database initialization only establishes the connection.
- All schema changes land through `database/migrations/`.
- When modifying GORM models, evaluate whether a new migration is required.

## Related Pages

- [Overview](/projects/hrpauth/)
- [Configuration & API](/projects/hrpauth/configuration)
- [Architecture](/projects/hrpauth/architecture)
