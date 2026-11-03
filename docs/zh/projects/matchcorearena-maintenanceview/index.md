# MatchCoreArena MaintenanceView

MatchCoreArena MaintenanceView 是 MatchCoreArena 平台的运维桌面控制台。这是一个 Wails 应用，通过服务端运维 SQL 通道查看用户与对局、模拟积分变动、管理配置备份。

## 覆盖范围

- 一个展示用户总数与活跃对局数的仪表盘
- 用户浏览页，可直接修改排位积分
- 对局管理页，可手工上传一条战绩
- 积分模拟器，在本地跑 Elo 公式
- 配置管理页，带时间戳备份、历史列表与还原
- Redis 键浏览器，界面存在，但运行时已禁用

## 技术栈

- 后端：Go 1.25、Wails v2.15
- 前端：React 19、TypeScript、Vite 7、Material UI v9、recharts、lucide-react
- MySQL 与 Redis 驱动仍留在 `go.mod` 里，但直连已在运行时禁用
- 没有自己的 HTTP 服务，对外只发运维 SQL 请求

## 目录结构

```text
main.go                  # Wails 引导，窗口标题 MCA-Maintenance
app.go                   # 绑定给前端的 11 个方法
wails.json               # Wails 项目配置
config.yaml              # 运行期配置，按相对路径读取
internal/
  config/config.go       # LoadConfig 与默认值常量
  logic/maintenance.go   # 运维服务、配置备份与还原
  logic/rating.go        # 本地 Elo 模拟
  models/models.go       # 共享数据模型
frontend/
  src/components/        # Dashboard、RedisBrowser、DatabaseManager、MatchManager、RatingSimulator、ConfigManager
  dist/                  # 构建产物，内嵌进二进制
build/                   # 打包资产，bin/ 下有 MCA-Maintenance、config.yaml、config_history/
HA-Contract              # 指向共享契约仓库的符号链接
```

## 运行方式

### 运行前准备

- Go 1.25 与 Wails CLI
- 前端所需的 Node.js 与 npm
- 一个正在运行的 [MatchCoreArena Server](/zh/projects/matchcorearena-server/)
- 工作目录下的 `config.yaml`

### 构建

```bash
wails build
```

### 运行

```bash
./build/bin/MCA-Maintenance
```

开发模式：

```bash
wails dev
```

Wails 调试服务监听 `http://localhost:34115`。配置文件按相对路径读取，所以二进制必须在含有 `config.yaml` 的目录里运行。仓库里的 `build/bin/` 目录正好带了一份副本。

这个仓库没有 Makefile，没有 Dockerfile，也没有 docker-compose。

## 配置

`config.yaml` 由 `internal/config.LoadConfig` 读取。文件缺失时会退回默认值，因此没有配置文件也能启动。

- `upstream_url`：服务端地址，默认 `https://arena.mcnb.dev/`
- `management_token`：运维凭据，必须与服务端的 `auth.maintenance_token` 一致
- `database.dsn`：默认 `root:@tcp(127.0.0.1:3306)/matchcorearena?parseTime=true`
- `redis.addr`、`redis.password`、`redis.db`：Redis 连接，直连已禁用

控制台只会发出一种后端调用。

```http
POST https://arena.mcnb.dev/api/maintenance/sql
Authorization: Bearer <management_token>
Content-Type: application/json

{"sql": "SELECT COUNT(*) FROM users"}
```

响应按 `success` 与 `data` 解析。请求超时 10 秒。

配置变更的版本管理靠备份，而不是结构版本号。

- 保存时把旧文件写到 `config_history/config_<YYYYMMDD_HHMMSS>.yaml`
- 历史列表就是 `config_history/` 下以 `config_` 开头、以 `.yaml` 结尾的文件，按时间倒序
- 还原会把选中的备份覆盖到 `config.yaml`，并再把当前文件备份一次，命名为 `config_before_restore_<YYYYMMDD_HHMMSS>.yaml`

## 绑定方法

前端通过 `app.go` 绑定的 11 个方法访问后端。

- `GetConfig`
- `GetRedisKeys(pattern)`
- `DeleteRedisKey(key)`
- `GetUsers`
- `UpdateUserRankScore(uid, score)`
- `SimulateRating(input)`
- `GetSystemStats`
- `UploadMatchResult(result)`
- `SaveConfig(cfg)`
- `GetConfigHistory()`
- `RestoreConfig(filename)`

## 当前状态

在依赖界面上某个按钮之前，先了解下面这些。

- `GetRedisKeys` 与 `DeleteRedisKey` 直接返回 `direct redis access is disabled`。前端里的 Redis 浏览器做不了任何事
- `GetUsers`、`GetSystemStats`、`UpdateUserRankScore` 与 `UploadMatchResult` 全部基于运维 SQL 通道实现，并且用字符串拼串构造 SQL。`UpdateUserRankScore` 发出的是 `UPDATE users SET rank_score = %d WHERE uid = %d`
- `UploadMatchResult` 往 `matches` 插入时使用的列是 `match_type`、`winner_uid`、`score_delta` 与 `created_at`。服务端表结构里没有 `score_delta` 这一列，所以这条语句会失败
- `SimulateRating` 是纯本地计算，从不调用服务端。它的权重常量与服务端一致：`K` 在前 10 胜内从 `520` 降到 `390`，之后为 `190`；`W_round` 取 `1.00`、`1.05`、`1.15` 或 `1.25`；`W_streak` 胜方取 `1.00`、`1.15` 或 `1.28`，败方取 `1.00`、`0.85` 或 `0.73`；`W_perf` 被夹紧到 `[0.95, 1.05]`
- README 仍然是 Wails 官方 React TypeScript 模板的默认文本，没有任何项目信息

## 与其它项目的关系

- **只依赖** [MatchCoreArena Server](/zh/projects/matchcorearena-server/)，入口是 `POST /api/maintenance/sql`
- **没有直接调用** [BedwarsRel](/zh/projects/bedwarsrel/) 或 [BedwarsRel-MCA](/zh/projects/bedwarsrel-mca/)。对局管理页操作的是 BedwarsRel-MCA 已经上报落库的 `matches` 与 `users` 表

## 相关页面

- [MatchCoreArena Server](/zh/projects/matchcorearena-server/)：本控制台管理的后端
- [MatchCoreArena Server 架构说明](/zh/projects/matchcorearena-server/architecture)：评分模型与运维通道
- [MatchCoreArena Client](/zh/projects/matchcorearena-client/)：同一平台面向玩家的客户端
