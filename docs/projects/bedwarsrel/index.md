# BedwarsRel

BedwarsRel is a Bedwars minigame plugin for Spigot and CraftBukkit servers. Teams defend their bed, resource spawners drop items on the map, players buy gear and blocks in the villager shop, and the last team standing wins.

## What It Covers

- Multi-team Bedwars rounds with bed defense, resource spawners, and a villager shop
- Game setup through commands, including regions, spawn points, beds, teams, and signs
- A lobby with scoreboards, titles, a join sign, and a BungeeCord channel
- Player statistics kept either in YAML files or in a database
- Localisation in 90 languages, synchronised through Crowdin
- A Bukkit event API that other plugins can hook into

## Tech Stack

- Java, source and target level 1.7
- Maven multi-module build, groupId `io.github.bedwarsrel`, artifactId `BedwarsRel-Parent`, version 1.3.6
- spigot-api 1.12-R0.1-SNAPSHOT as a provided dependency, plus lombok, hologramapi, HolographicDisplaysAPI, bugsnag, slf4j-log4j12, and HikariCP-java7
- No Vault dependency, the shop currency is the iron and gold ingots dropped by the resource spawners

`plugin.yml` soft-depends on Multiverse-Core, Multiworld, MultiWorld, HolographicDisplays, HologramAPI, and UltimateCore. The HolographicDisplays API jar is checked into `lib/`.

## Directory Layout

```text
common/          # all business logic: commands, game, listener, shop, events, statistics, database, updater, utils, villager, localization
common/src/main/resources/  # config.yml, shop.yml, locale.yml, plugin.yml, and the locale/ directory with 90 language files
plugin/          # no sources, only the final packaging with shade into one jar
v1_8_r1/ ... v1_12_r1/  # per server version adapters, loaded by reflection on the package suffix
build/get-dependencies.sh  # installs the 8 CraftBukkit jars into the local Maven repository
lib/             # the HolographicDisplays API jar
circle.yml       # CircleCI pipeline
crowdin.yaml     # translation sync rules
settings.xml     # Maven settings for the Sonatype deploy
release.txt      # released version list
```

## Running It

### Prerequisites

- A JDK able to compile with source and target 1.7
- Maven
- A Spigot or CraftBukkit server, 1.8 through 1.12

### Build

```bash
bash build/get-dependencies.sh
mvn clean install -fae -P ci-snapshot,attach-javadocs,attach-sources
```

The first command fetches and installs the CraftBukkit jars into your local repository. The build produces `plugin/target/BedwarsRel-1.3.6-SNAPSHOT.jar`.

The shade plugin excludes guava and relocates bugsnag, jackson, log4j, slf4j, and HikariCP into a `thirdparty` namespace.

### Run

Drop the built jar into the `plugins` directory of your server and start it. The plugin registers the single root command `/bw` and the `BungeeCord` plugin channel.

## Configuration

`config.yml` is 964 lines long and holds everything except the shop and the translations.

- `locale`: language to use, default `en_US`
- `chat-prefix`, `global-messages`, `global-chat-after-end`: chat behaviour
- `gamelength`: round length in minutes, default 60
- `lobbytime`: lobby countdown in seconds, default 60
- `game-block`: the block that acts as a bed, default `BED_BLOCK`
- `hearts-on-death`, `die-on-void`, `spawn-ressources-in-chest`: round rules
- `breakable-blocks.use-as-blacklist`: flips the meaning of the block list
- `scoreboard`, `lobby-scoreboard`, `titles`: display options
- `explodes.*`: explosion behaviour
- `endgame.mainlobby-enabled`: send players to the main lobby after a round
- `bungeecord.*`: BungeeCord integration
- `statistics.enabled`, `statistics.storage` (`yaml` or `database`), `statistics.scores.*`: statistics
- `database.*`: database connection, table prefix `bw_`
- `resource.bronze`, `resource.iron`, `resource.gold`: the three resource spawners
- `rewards.*`, `specials.*`, `sign.*`, `player-settings.*`, `check-updates`

`shop.yml` describes the shop categories and their offers.

### Translations

There is no `languages` directory. The mechanism is:

- `common/src/main/resources/locale.yml` is the English base
- `common/src/main/resources/locale/<lang>.yml` holds the 90 translated files
- at runtime the plugin prefers `<dataFolder>/locale/<locale>.yml` so you can override any language
- a missing file falls back to `en_US`
- the player language is read from the `locale` field of the NMS player object
- `crowdin.yaml` defines the sync rules, and `/bw reload` re-reads the translations

## Command Surface

The root command `/bw` requires `bw.base`. It has 34 subcommands, including `help`, `setspawner`, `addgame`, `start`, `stop`, `addteam`, `save`, `setregion`, `join`, `setspawn`, `setlobby`, `settarget`, `setbed`, `leave`, `reload`, `list`, `stats`, `setminplayers`, `setgameblock`, `setbuilder`, `setautobalance`, `kick`, and `autojoin`.

## Event API

The events live in `io.github.bedwarsrel.events`. There are 19 Bukkit events, among them `BedwarsGameStartEvent`, `BedwarsGameEndEvent`, `BedwarsPlayerJoinEvent`, `BedwarsTargetBlockDestroyedEvent`, `BedwarsResourceSpawnEvent`, and `BedwarsOpenShopEvent`. Several of them are cancellable.

## Permissions

- `bw.base`: everyone, it guards the basic player commands
- `bw.setup`: creating and editing games
- `bw.kick`: kicking players from a game
- `bw.cmd`: running non-Bedwars commands in game
- `bw.otherstats`: viewing the statistics of other players
- `bw.vip.*`: special user permissions

## Relationship With Other Projects

- **Is self-contained**, it only depends on the Bukkit and Spigot API, the hologram plugins, and Bugsnag, and the code contains no `HA-*` reference
- **Is the upstream of** [BedwarsRel MCA](/projects/bedwarsrel-mca/), the MatchCoreArena branch

## Related Pages

- [BedwarsRel MCA](/projects/bedwarsrel-mca/): the MatchCoreArena branch of this plugin
- [MatchCoreArena Server](/projects/matchcorearena-server/): the service that receives match reports
