# BedwarsRel

BedwarsRel 是面向 Spigot 与 CraftBukkit 服务端的 Bedwars 小游戏插件。多支队伍守床拆床，地图上的资源点刷出物品，玩家在村民商店购买装备与方块，最后存活的队伍获胜。

## 覆盖范围

- 多队伍 Bedwars 对局，含守床、资源点与村民商店
- 通过命令完成对局配置，包括区域、出生点、床、队伍与告示牌
- 大厅侧有计分板、标题、加入告示牌，并支持 BungeeCord 频道
- 玩家统计可存为 YAML 文件，也可存入数据库
- 90 种语言的本地化，通过 Crowdin 同步
- 供其它插件接入的 Bukkit 事件 API

## 技术栈

- Java，source 与 target 均为 1.7
- Maven 多模块构建，groupId `io.github.bedwarsrel`，artifactId `BedwarsRel-Parent`，版本 1.3.6
- 依赖 provided 作用域的 spigot-api 1.12-R0.1-SNAPSHOT，以及 lombok、hologramapi、HolographicDisplaysAPI、bugsnag、slf4j-log4j12、HikariCP-java7
- 不依赖 Vault，商店货币是资源点刷出的铁锭与金锭

`plugin.yml` softdepend 了 Multiverse-Core、Multiworld、MultiWorld、HolographicDisplays、HologramAPI 与 UltimateCore。HolographicDisplays 的 API jar 放在 `lib/` 里。

## 目录结构

```text
common/          # 全部业务逻辑：commands、game、listener、shop、events、statistics、database、updater、utils、villager、localization
common/src/main/resources/  # config.yml、shop.yml、locale.yml、plugin.yml，以及存放 90 个语言文件的 locale/ 目录
plugin/          # 没有源码，只用 shade 把各模块合并成一个 jar
v1_8_r1/ ... v1_12_r1/  # 按服务器版本拆分的适配包，运行期按包名后缀反射加载
build/get-dependencies.sh  # 把 8 个 CraftBukkit jar 装进本地 Maven 仓库
lib/             # HolographicDisplays API jar
circle.yml       # CircleCI 流水线
crowdin.yaml     # 翻译同步规则
settings.xml     # 发布到 Sonatype 用的 Maven 配置
release.txt      # 已发布版本列表
```

## 运行方式

### 运行前准备

- 能以 source 和 target 1.7 编译的 JDK
- Maven
- 1.8 到 1.12 的 Spigot 或 CraftBukkit 服务端

### 构建

```bash
bash build/get-dependencies.sh
mvn clean install -fae -P ci-snapshot,attach-javadocs,attach-sources
```

第一条命令会把 CraftBukkit jar 下载并安装到本地仓库。构建产物是 `plugin/target/BedwarsRel-1.3.6-SNAPSHOT.jar`。

shade 插件会排除 guava，并把 bugsnag、jackson、log4j、slf4j、HikariCP relocation 到 `thirdparty` 命名空间下。

### 运行

把构建好的 jar 放进服务端的 `plugins` 目录后启动。插件会注册唯一的根命令 `/bw` 与 `BungeeCord` 插件频道。

## 配置

`config.yml` 有 964 行，除商店与翻译之外的内容都在里面。

- `locale`：使用的语言，默认 `en_US`
- `chat-prefix`、`global-messages`、`global-chat-after-end`：聊天行为
- `gamelength`：对局时长，单位分钟，默认 60
- `lobbytime`：大厅倒计时，单位秒，默认 60
- `game-block`：充当床的方块，默认 `BED_BLOCK`
- `hearts-on-death`、`die-on-void`、`spawn-ressources-in-chest`：对局规则
- `breakable-blocks.use-as-blacklist`：翻转可破坏方块列表的含义
- `scoreboard`、`lobby-scoreboard`、`titles`：显示相关配置
- `explodes.*`：爆炸行为
- `endgame.mainlobby-enabled`：对局结束后把玩家送回主大厅
- `bungeecord.*`：BungeeCord 集成
- `statistics.enabled`、`statistics.storage`（`yaml` 或 `database`）、`statistics.scores.*`：统计
- `database.*`：数据库连接，表前缀 `bw_`
- `resource.bronze`、`resource.iron`、`resource.gold`：三种资源点
- `rewards.*`、`specials.*`、`sign.*`、`player-settings.*`、`check-updates`

`shop.yml` 描述商店分类与每个分类下的 offers。

### 翻译

仓库里没有 `languages` 目录，实际机制是：

- `common/src/main/resources/locale.yml` 是英文基准
- `common/src/main/resources/locale/<lang>.yml` 是 90 个翻译文件
- 运行期优先读取 `<dataFolder>/locale/<locale>.yml`，因此你可以覆盖任意语言
- 文件缺失时回退到 `en_US`
- 玩家语言取自 NMS 玩家对象的 `locale` 字段
- `crowdin.yaml` 定义同步规则，`/bw reload` 会重新加载翻译

## 命令接口

根命令 `/bw` 需要 `bw.base` 权限，共 34 个子命令，包括 `help`、`setspawner`、`addgame`、`start`、`stop`、`addteam`、`save`、`setregion`、`join`、`setspawn`、`setlobby`、`settarget`、`setbed`、`leave`、`reload`、`list`、`stats`、`setminplayers`、`setgameblock`、`setbuilder`、`setautobalance`、`kick` 与 `autojoin`。

## 事件 API

事件位于 `io.github.bedwarsrel.events`，共 19 个 Bukkit 事件，包括 `BedwarsGameStartEvent`、`BedwarsGameEndEvent`、`BedwarsPlayerJoinEvent`、`BedwarsTargetBlockDestroyedEvent`、`BedwarsResourceSpawnEvent` 与 `BedwarsOpenShopEvent`，其中一部分可以被取消。

## 权限

- `bw.base`：所有人，用于基础玩家命令
- `bw.setup`：创建与编辑对局
- `bw.kick`：把玩家踢出对局
- `bw.cmd`：在对局中执行非 Bedwars 命令
- `bw.otherstats`：查看其它玩家的统计
- `bw.vip.*`：特殊用户权限

## 与其它项目的关系

- **完全自包含**，只依赖 Bukkit/Spigot API、全息类插件与 Bugsnag，代码里没有任何 `HA-*` 引用
- **是** [BedwarsRel MCA](/zh/projects/bedwarsrel-mca/) 的上游，后者是它的 MatchCoreArena 分支

## 相关页面

- [BedwarsRel MCA](/zh/projects/bedwarsrel-mca/)：这个插件的 MatchCoreArena 分支
- [MatchCoreArena 服务端](/zh/projects/matchcorearena-server/)：接收比赛结果上报的服务
