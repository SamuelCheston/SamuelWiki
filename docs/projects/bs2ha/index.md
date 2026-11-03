# BS2HA

BS2HA is a one-shot offline migration CLI. It turns a Blessing-Skin-Server SQL dump and texture directory into SQL files you can import into HRPAuth Core and HRPAuth Yggdrasil, plus a migration report.

## What It Covers

- Parse the BlessingSkin SQL dump with a self-written parser, no database driver involved
- Map users, players and textures onto the HA data model
- Detect the password method from the dump and decide who has to reset
- Sign the `textures` profile property with the HRPAuth private key
- Emit two import SQL files, a JSON migration report and a copy of the textures
- Ship the baseline SQL inside the binary so the tool starts with no setup

## Tech Stack

- Go 1.26, charmbracelet/huh for the TUI, charmbracelet/lipgloss for the styling
- Own SQL dump parser, no database driver, no network access, no HTTP service
- Baseline SQL embedded with `go:embed`

## Directory Layout

```text
cmd/bs2ha/main.go     # the only entry point
internal/app/app.go   # command dispatch and flag parsing
internal/bsdump/      # SQL dump parser
internal/convert/     # conversion core: table mapping, password detection, key generation, texture signing, report
internal/tui/         # interactive wizard
internal/assets/      # embedded baseline SQL
docs/design.md        # migration design notes
```

## Running It

### Prerequisites

- Go 1.26
- A Blessing-Skin-Server directory that holds the SQL dump and the texture directory
- Nothing else, the tool works fully offline

### Build

```bash
go build -o bs2ha ./cmd/bs2ha
```

### Run

```bash
./bs2ha
```

Run it in the root of the Blessing-Skin-Server installation.

Without the required parameters it opens the TUI wizard, which probes the current directory for `bs.sql`, the texture directory and the key files. When no private key is given it generates an RSA 4096-bit key and writes it to `hrpauth-generated.key`.

There is no port and no daemon mode. The Docker image is a one-shot task.

## Configuration

There is no YAML file. Everything comes from the command line.

- `--bs-sql` (default `./bs.sql`): path to the BlessingSkin SQL dump
- `--bs-textures` (default `storage/textures`): path to the texture directory, skipped when it does not exist
- `--ha-callback-url`: HRPAuth callback base URL, used to build the texture URL
- `--ha-private-key` / `--ha-private-key-content`: the HRPAuth Yggdrasil signing key, by path or as raw PEM
- `--ha-gen-key-path` (default `hrpauth-generated.key`): where the generated key is saved
- `--ha-baseline-sql` / `--ygg-baseline-sql`: baseline templates, released from the embedded assets when the files are missing
- `--ha-out-sql` / `--ygg-out-sql`: output paths of the two import SQL files
- `--out-report`: output path of the migration report
- `--ha-textures-out`: output directory of the copied textures
- `--bs-username-column` (default `nickname`): the canonical username column in the BS `users` table
- `--unsigned`: allow unsigned texture properties when no private key is available

## Outputs

- `ha-import.sql`: the `users` rows for the HRPAuth Core database
- `ygg-import.sql`: the `accounts`, `profiles` and `profile_properties` rows for the Yggdrasil database
- the migration report in JSON
- the copied texture directory

## Migration Rules

- The password method is detected from the SQL dump. `BCRYPT` hashes are copied directly, every other method becomes the fixed marker `BS2HA$RESET_REQUIRED` and the user has to reset the password after the migration.
- The canonical BS username comes from `users.nickname` and is written to the HA `users.username`. A user without a recoverable name is reported and treated as a failure, the tool never invents one.
- The BS `users.uid` is kept as is, the HA side generates a new `users.uuid`.
- Migrated users get these default values: `cbh = 1`, `mbe = 0`, `regip = ip`, `mojang_uuid = NULL`, `totp = NULL`.
- A BS user with one player keeps that player. With several players only the one whose name equals the BS username is kept. Without such a player a placeholder profile is created with the BS username, and the dropped players are reported.
- The BS texture hash is reused as is, the texture file is copied over and the `textures` profile property carries the signed Yggdrasil payload.
- Only `users`, `profiles` and `profile_properties` are migrated. Sessions, tokens and `oauth2_*` are out of scope.
- `--unsigned` is for non-production imports only.

## Relationship With Other Projects

- **Feeds** [HRPAuth](/projects/hrpauth/) and [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) at the data level, the two SQL files are imported into the two databases separately
- **Is unrelated to** the HRPAuth microservice extension layer
- **Is** the only fully offline project of the four, it never contacts a running service

## Related Pages

- [HRPAuth](/projects/hrpauth/): the Core database the `users` rows are imported into
- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/): the Yggdrasil database the accounts, profiles and properties are imported into
