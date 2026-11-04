# Database Migrations

Database schema is managed by SQL migrations ([golang-migrate](https://github.com/golang-migrate/migrate) format in `database/migrations/`), embedded into the binary. GORM's `AutoMigrate` is **not** used.

## Startup Behavior

The service applies migrations itself once the database connection is established:

1. It opens the database using the `database.*` settings of `config.yaml`, including the connection retry settings
2. It ensures the `schema_migrations` bookkeeping table exists
3. It runs all unapplied migration steps from the embedded files

A database in a dirty state aborts the migration step; the startup logs a warning and the schema stays behind until the state is fixed and the version forced. When there is nothing to apply, the step is a no-op. There is no standalone migrate CLI anymore; the former `cmd/migrate` entry point was removed. The current version state lives in the `schema_migrations` table.

## Layout

- `000001_baseline` is the squashed core schema (`users`, `oauth2_clients`, `oauth2_authorization_codes`, `oauth2_access_tokens`, `oauth2_refresh_tokens`, `deleted_accounts`, `webauthn_credentials`). The historical steps `000002`–`000012` were squashed into the baseline on 2026-10-14 (`b8a745c`). Minecraft-specific tables live in HRPAuth-Yggdrasil-API (`000001_init`).

## Rules

- All schema changes land through `database/migrations/`.
- When modifying GORM models, evaluate whether a new migration is required.
- A dirty migration state must be resolved manually (fix the state, force the version); the service warns about it on every startup until then.

## Related Pages

- [Overview](/projects/hrpauth/)
- [Configuration & API](/projects/hrpauth/configuration)
- [Architecture](/projects/hrpauth/architecture)
