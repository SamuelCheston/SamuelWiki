# BedwarsRel MCA

BedwarsRel MCA is the MatchCoreArena branch of BedwarsRel. It keeps the Bedwars gameplay, trims the supported server versions, drops the Lombok and HologramAPI dependencies, and adds reporting of match results to the MatchCoreArena business API.

## What It Covers

- The same Bedwars gameplay, commands, events, listeners, and permissions as the upstream plugin
- Match result reporting to the MatchCoreArena business API once a game is over
- Server support limited to 1.8, 1.8.3, 1.8.8, and 1.12
- Holograms through HolographicDisplays only
- The same 90 language translations and the same Crowdin setup

## Tech Stack

- Java, source and target level 1.8, built with maven-compiler-plugin 3.11.0
- The parent POM no longer declares lombok, every `@Data`, `@Getter`, and `@Setter` was replaced by hand written accessors
- The `org.inventivetalent:hologramapi` dependency is gone
- The parent POM adds the `codemc-repo` and `jitpack.io` repositories
- Still no Vault dependency, the shop currency stays the iron and gold ingots from the resource spawners

### Modules

Only these modules remain: `v1_8_r1`, `v1_8_r2`, `v1_8_r3`, `v1_12_r1`, `common`, and `plugin`. Support for 1.9 through 1.11 was dropped.

## Directory Layout

```text
common/          # business logic, same layout as upstream plus utils/MatchReporter.java
common/src/main/resources/  # config.yml with the extra match-reporting block, shop.yml, locale.yml, plugin.yml, locale/
plugin/          # packaging module, dependencies trimmed to Common plus the three 1.8 modules and 1.12
v1_8_r1/ v1_8_r2/ v1_8_r3/ v1_12_r1/  # the supported server version adapters
build.sh         # one command build
build/get-dependencies.sh  # installs the local jars from the repository root
craftbukkit-*.jar  # the 4 CraftBukkit jars the build installs
HA-Contract      # symlink to the contract repository
.trae/rules/docs.md  # declares HA-Contract the sole authoritative documentation source
```

The differences from upstream are:

- `common/src/main/java/io/github/bedwarsrel/utils/MatchReporter.java` is new
- `HologramAPIInteraction.java` was deleted
- the hologram setup in `BedwarsRel.java` only checks HolographicDisplays

## Running It

### Prerequisites

- A JDK able to compile with source and target 1.8
- Maven

### Build

```bash
bash build.sh
```

The script checks that java and mvn are present, installs the version-specific dependencies, and then runs `mvn clean install -DskipTests -fae`. The plugin lands in `plugin/target/BedwarsRel-*.jar`.

`build/get-dependencies.sh` installs four jars from the repository root into the local Maven repository: `craftbukkit-1.12.jar`, `craftbukkit-1.8-R0.1-SNAPSHOT.jar`, `craftbukkit-1.8.3.jar`, and `craftbukkit-1.8.8.jar`.

### Run

Drop the jar into the `plugins` directory of a supported server and start it. The plugin registers the same `/bw` command tree as upstream.

## Configuration

The configuration inherits every key from the upstream `config.yml` and adds one block:

```yaml
match-reporting:
    api-url: "https://api.matchcorearena.com/api/matches"
    access-token: "your-access-token-here"
```

While `access-token` still holds the placeholder value, the report is skipped.

`plugin.yml`, `shop.yml`, and `locale.yml` are byte for byte identical to the upstream files.

## Match Reporting

`GameCycle.runGameOver(winner)` calls `MatchReporter.report(game, winner)` after the `BedwarsGameOverEvent` was not cancelled. The reporter runs on its own thread and POSTs a JSON document to `match-reporting.api-url` with the header `Authorization: Bearer <token>`.

The payload carries `match_type`, `winner_team`, and `loser_teams`. Each team carries `team_id`, `initial_count`, `alive_count`, and `members`. Each member carries `uuid`, `survival_time`, `kills`, `deaths`, and `perf_tweak`. The top level also carries `duration_seconds`, `started_at`, and `finished_at` in ISO8601 UTC.

These field names follow the `matchcorearena-business.yaml` specification in [HA-Contract](/projects/ha-contract/).

## Relationship With Other Projects

- **Is based on** [BedwarsRel](/projects/bedwarsrel/), which stays the upstream
- **Reports to** [MatchCoreArena Server](/projects/matchcorearena-server/), the owner of the business API
- **Authenticates through** that server, which in turn uses [HRPAuth](/projects/hrpauth/)
- **Follows** [HA-Contract](/projects/ha-contract/) for the report format, the plugin itself does not compile against it
- **Has no code dependency on** the HA Services projects

### Known Inconsistency

The README is still the upstream one. It does not mention that Lombok was removed or that support for 1.9 through 1.11 was dropped. `pom.xml` and the code are the source of truth.

## Related Pages

- [BedwarsRel](/projects/bedwarsrel/): the upstream plugin
- [MatchCoreArena Server](/projects/matchcorearena-server/): the API that receives the reports
- [HA-Contract](/projects/ha-contract/): the contract the report payload follows
