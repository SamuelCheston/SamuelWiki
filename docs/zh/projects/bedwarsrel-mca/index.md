# BedwarsRel MCA

BedwarsRel MCA 是 BedwarsRel 的 MatchCoreArena 定制分支。它保留了 Bedwars 玩法，裁剪了支持的服务器版本，去掉 Lombok 与 HologramAPI 依赖，并新增了把比赛结果上报到 MatchCoreArena 业务 API 的能力。

## 覆盖范围

- 与上游插件相同的 Bedwars 玩法、命令、事件、监听器与权限
- 对局结束后把比赛结果上报到 MatchCoreArena 业务 API
- 服务器支持缩减为 1.8、1.8.3、1.8.8 与 1.12
- 全息只保留 HolographicDisplays
- 同样有 90 个语言翻译与同样的 Crowdin 配置

## 技术栈

- Java，source 与 target 均为 1.8，使用 maven-compiler-plugin 3.11.0 构建
- 父 pom 移除了 lombok，原有的 `@Data`、`@Getter`、`@Setter` 全部改为手写 getter/setter
- 移除了 `org.inventivetalent:hologramapi` 依赖
- 父 pom 新增 `codemc-repo` 与 `jitpack.io` 仓库
- 仍然没有 Vault 依赖，商店货币仍是资源点刷出的铁锭与金锭

### 模块

保留的模块只有 `v1_8_r1`、`v1_8_r2`、`v1_8_r3`、`v1_12_r1`、`common` 与 `plugin`。1.9 到 1.11 的支持被删除。

## 目录结构

```text
common/          # 业务逻辑，结构与上游一致，新增 utils/MatchReporter.java
common/src/main/resources/  # config.yml 含新增的 match-reporting 段，另有 shop.yml、locale.yml、plugin.yml、locale/
plugin/          # 打包模块，依赖裁剪为 Common 加三个 1.8 模块与 1.12
v1_8_r1/ v1_8_r2/ v1_8_r3/ v1_12_r1/  # 保留的服务器版本适配包
build.sh         # 一键构建脚本
build/get-dependencies.sh  # 从仓库根目录安装本地 jar
craftbukkit-*.jar  # 构建时安装的 4 个 CraftBukkit jar
HA-Contract      # 指向契约仓库的符号链接
.trae/rules/docs.md  # 声明 HA-Contract 是唯一权威文档来源
```

与上游的差异是：

- 新增 `common/src/main/java/io/github/bedwarsrel/utils/MatchReporter.java`
- 删除 `HologramAPIInteraction.java`
- `BedwarsRel.java` 的全息初始化只判断 HolographicDisplays

## 运行方式

### 运行前准备

- 能以 source 和 target 1.8 编译的 JDK
- Maven

### 构建

```bash
bash build.sh
```

脚本会检查 java 与 mvn 是否存在，安装各版本依赖，然后执行 `mvn clean install -DskipTests -fae`。产物在 `plugin/target/BedwarsRel-*.jar`。

`build/get-dependencies.sh` 会把仓库根目录的四个 jar 装进本地 Maven 仓库：`craftbukkit-1.12.jar`、`craftbukkit-1.8-R0.1-SNAPSHOT.jar`、`craftbukkit-1.8.3.jar`、`craftbukkit-1.8.8.jar`。

### 运行

把 jar 放进受支持服务端的 `plugins` 目录后启动。插件注册的命令树与上游完全相同。

## 配置

配置继承上游 `config.yml` 的全部键，并新增一段：

```yaml
match-reporting:
    api-url: "https://api.matchcorearena.com/api/matches"
    access-token: "your-access-token-here"
```

当 `access-token` 仍是占位值时，上报会被直接跳过。

`plugin.yml`、`shop.yml` 与 `locale.yml` 与上游逐字节相同。

## 比赛结果上报

`GameCycle.runGameOver(winner)` 在 `BedwarsGameOverEvent` 未被取消之后调用 `MatchReporter.report(game, winner)`。上报在独立线程里执行，向 `match-reporting.api-url` POST 一个 JSON 文档，Header 为 `Authorization: Bearer <token>`。

上报字段包含 `match_type`、`winner_team` 与 `loser_teams`。每个队伍包含 `team_id`、`initial_count`、`alive_count` 与 `members`，每个成员包含 `uuid`、`survival_time`、`kills`、`deaths` 与 `perf_tweak`。顶层还有 `duration_seconds`、`started_at` 与 `finished_at`，时间格式为 ISO8601 UTC。

这些字段与 [HA-Contract](/zh/projects/ha-contract/) 的 `matchcorearena-business.yaml` 规范对齐。

## 与其它项目的关系

- **基于** [BedwarsRel](/zh/projects/bedwarsrel/)，后者仍是上游
- **上报到** [MatchCoreArena 服务端](/zh/projects/matchcorearena-server/)，业务 API 由它持有
- **通过**该服务端完成认证，最终落到 [HRPAuth](/zh/projects/hrpauth/)
- **遵循** [HA-Contract](/zh/projects/ha-contract/) 的上报格式，插件本身并不编译依赖它
- **与** HA-Services 系列没有代码级依赖

### 已知的文档不一致

README 仍然是上游那份。它没有说明 Lombok 已被移除，也没有说明 1.9 到 1.11 的支持已被删除。`pom.xml` 与代码才是准确来源。

## 相关页面

- [BedwarsRel](/zh/projects/bedwarsrel/)：上游插件
- [MatchCoreArena 服务端](/zh/projects/matchcorearena-server/)：接收上报的 API
- [HA-Contract](/zh/projects/ha-contract/)：上报格式遵循的契约
