# Configuration

The service reads one YAML file, `config/config.yaml`. The file carries a `version`, and the loader either matches it, migrates it forward, or refuses to start. This page explains the lifecycle and then each block.

## The Versioned Config File

### How the version is checked

The path comes from the `CONFIG_PATH` environment variable, and falls back to `config/config.yaml`.

- the file is missing: it is created with the current defaults and the current version
- the file is present: it is parsed as a plain map first, so unknown keys do not break the migration step
- `version` is missing or is not a valid `x.y.z`: the load fails, there is no lenient fallback
- `version` is older than the code: the migration chain runs, one step at a time
- `version` is newer than the code: the load fails and asks you to upgrade the program

After the migration the version is checked again against the version the code was built with. A migration chain that does not reach it is an error.

### The migration chain

The code currently supports `1.4.0`.

- `1.0.0` to `1.1.0`: adds the `auth` block with an empty `hrpauth` default
- `1.1.0` to `1.2.0`: restructures `auth.hrpauth` into a single `base_url`. The old `issuer` value is reused, with a trailing `/oauth2` or `/.well-known/openid-configuration` removed
- `1.2.0` to `1.3.0`: adds `auth.hrpauth.public_client_id` with the default `hrpauth-webui`
- `1.3.0` to `1.4.0`: adds `auth.maintenance_token`, generated as a random 64 character hex string when the key is missing

When you change the config structure, bump `CurrentVersion`, append the migration, and update `config/config.example.yaml` in the same change.

## Required Fields

The validation runs after the migration, on the strongly typed struct.

- `server.port` must be between 1 and 65535
- `database.host` and `database.name` must not be empty
- `database.max_open_conns` and `database.max_idle_conns` must not be negative
- `auth.hrpauth.base_url` must not be empty

Everything else has a default.

## The Main Blocks

### `server`

- `host`: listen host, the default is `0.0.0.0`
- `port`: listen port, the default is `9178`
- `read_timeout_seconds`: the default is `15`
- `write_timeout_seconds`: the default is `15`

### `database`

- `host`, `port`, `user`, `password`: the MySQL connection
- `name`: the database name, the default is `matchcorearena`
- `max_open_conns`: the default is `50`
- `max_idle_conns`: the default is `10`

The database itself must already exist. The migration only creates tables inside it.

### `redis`

- `host`, `port`, `password`, `db`: the default is `localhost:6379` on database `0`

Redis is used for two things: the token verification cache and the UUID to UID cache.

### `auth.hrpauth`

- `base_url`: the root address of HRPAuth, for example `http://localhost:8080`. The client appends the paths it needs, such as `/status`, `/oauth/login-ticket`, `/totp/verify`, `/oauth/token`, `/oauth/revoke`, `/user`, `/user/lookup-uuid`
- `public_client_id`: the OAuth2 public client ID, the default is `hrpauth-webui`

### `auth.maintenance_token`

The operator super credential. It grants every scope, and it is matched before anything else during token verification.

The value is generated automatically when the config file is created, as a random 64 character hex string. The same credential is what the maintenance console sends as its bearer token.

## tokens.yaml, the Service Credentials

`config/tokens.yaml` holds the high privilege credentials used between systems, outside the HRPAuth user system. It is loaded at startup, and a load failure is only a warning.

When the file is missing it is generated with two entries.

- `super-admin`: uid `-1`, scope `maintenance`
- `match-reporter`: uid `-100`, scopes `match:report` and `user:read`

Both tokens are 32 random bytes written as hex.

The verifier checks the credentials in this order.

1. `auth.maintenance_token` from the config file
2. every token in `config/tokens.yaml`
3. the HRPAuth `POST /user` endpoint with the caller's own bearer token

The file has no version and no migration. Entries are added by hand.

## Common Pitfalls

- A config that is migrated from `1.1.0` or older ends up with an empty `auth.hrpauth.base_url`, because the value is taken from the old `issuer` field and that field was usually empty. Fill it in, the validation rejects an empty base URL
- A `version` newer than the binary is a hard error, not a warning. Upgrade the program instead of downgrading the file
- The generated file and `config/config.example.yaml` disagree on `auth.hrpauth.base_url`. The generated file uses `http://localhost:2778`, the template uses `http://localhost:8080`. Check which one you actually have before debugging the auth proxy
- `config/tokens.yaml` is committed to the repository, while `config/config.yaml` is gitignored. The committed file holds a placeholder token, but any real token written there ends up in the git history
- `server.read_timeout_seconds` and `server.write_timeout_seconds` are loaded and validated but never applied. The server starts through `r.Run(addr)`, which sets no timeouts
- The Docker image ships without a config file, `.dockerignore` excludes `config.yaml` and `config.example.yaml`. The container generates `config/config.yaml` on first start inside `/app/config`
- `migrate.RunMigrations` only executes `migrations/baseline.sql`. The second migration file is embedded but never run, see [Architecture](/projects/matchcorearena-server/architecture)
- `database.name` decides which schema the migration touches. Pointing it at the wrong database creates the tables in the wrong place

## Related Pages

- [Overview](/projects/matchcorearena-server/)
- [Architecture](/projects/matchcorearena-server/architecture)
- [Configuration Guide](/guide/how-to-use-conf-file): the shared conventions for the YAML config files in this ecosystem
