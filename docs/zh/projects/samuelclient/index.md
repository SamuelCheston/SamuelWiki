# SamuelClient

SamuelClient 是一个基于 Wails 的跨平台 Minecraft 启动器桌面应用。它支持离线账号与 authlib-injector（Yggdrasil）账号，负责版本与模组管理、下载与启动全流程，并内嵌一个本地 HTTP API。

## 覆盖范围

- 离线账号与 authlib-injector（Yggdrasil）账号，支持令牌刷新与校验
- 版本浏览与下载，以及 Fabric、Forge 加载器版本
- 活跃配置文件的模组管理
- Java 运行时记录，可为每个配置文件指定默认版本
- 启动游戏，可配置内存区间、JVM 参数与窗口尺寸
- 内嵌的 Gin API 与内嵌的 SQLite 数据库，用于存放用户、配置、日志、任务、文件记录与 Java 安装

## 技术栈

- Go 1.25 与 Wails v2.12，负责桌面外壳与 Go 到 JavaScript 的绑定
- Gin v1.10 提供内嵌的本地 API
- modernc.org/sqlite 是纯 Go 的 SQLite 实现，因此不需要 CGO
- 前端使用 React 19、TypeScript、Vite 6 与 Material UI v9
- 外部服务：Mojang 官方 API、BMCLAPI、Fabric 与 Forge API，以及 authlib-injector 服务器

## 目录结构

```text
app.go                       # Wails 绑定与 Gin 服务启动
main.go                      # Wails 启动
wails.json                   # Wails 项目配置
internal/config/             # SERVER_PORT 与 GIN_MODE
internal/database/           # SQLite 初始化、WAL 模式与数据迁移
internal/handlers/           # handlers.go 处理通用与健康检查，db_handlers.go 处理各表 CRUD，mc_handlers.go 处理启动器业务
internal/middleware/         # Recovery、Logger 与 CORS
internal/repository/         # 数据访问层
internal/routes/             # Gin 路由装配，覆盖 /api/v1 与无前缀的 legacy 路由
internal/services/           # services.go 的 HTTPService，mc_services.go 覆盖 authlib、BMCLAPI、Fabric、Forge 与启动器，另有 Unix 与 Windows 的进程脱离实现
frontend/src/components/     # HomeView、VersionManager、AccountManager、ModManager、SettingsView、DebugView、LoginView
frontend/src/variables.ts    # 前端默认值
build/                       # darwin 与 windows 打包资产
docs/                        # minecraft-launcher-standard.md、BMCLAPI.pdf 与 authlib-injector wiki
```

## 运行方式

### 运行前准备

- Go 1.25 或更高版本
- Node.js 18 或更高版本
- Wails CLI，用 `wails doctor` 做环境自检
- Linux 需要 GCC、libgtk-3-dev、libwebkit2gtk-4.0-dev 与 pkg-config
- macOS 需要 Xcode Command Line Tools
- Windows 需要 MinGW-w64 或 MSYS2，以及 WebView2 运行时

### 构建

```bash
wails build
```

产物在 `build/bin/`，Linux 与 macOS 上是 `SamuelClient`，Windows 上是 `SamuelClient.exe`。跨平台构建用 `wails build -platform windows/amd64`。

### 运行

```bash
wails dev
```

内嵌的 Gin API 默认监听 34501 端口，Vite dev server 已配好 `/api` 代理。

这个仓库没有 Makefile，也没有 Dockerfile。

## 配置

Go 侧读取的环境变量：

- `SERVER_PORT`：本地 API 端口，默认 `34501`
- `GIN_MODE`：Gin 模式，默认 `debug`

SQLite 数据库位于 `~/.hrpml/data.db`，连接串带 `?_journal_mode=WAL&_busy_timeout=5000`，连接池固定为 1。首次启动时 `runMigrations` 会建好各张表。

前端环境变量：

- `CMCL_PATH`：默认 `java -jar ./cmcl.jar`
- `SHELL_API_URL`：默认 `http://localhost:34501`
- `GAME_DIR`：默认 `~/.minecraft`

前端默认把启动器内存设为最低 2048M、最高 4096M。后端在设置缺失时的兜底值是最低 1024M、最高 4096M。settings 表里的 `launcher.authlib_jar` 保存 authlib-injector jar 的路径。

## 本地 API

`/api/v1` 下的路由：

- `GET /health`、`GET /ping`、`GET /hello/:name`、`POST /echo`、`GET /sysinfo`
- `POST /shell/execute`、`POST /file/operation`
- `GET /db/stats`、`POST /db/cleanup`、`GET /db/schema`，以及 users、settings、logs、tasks、files、java 六组 CRUD
- `GET /auth/meta`、`POST /auth/login`、`POST /auth/refresh`、`POST /auth/validate`、`POST /auth/offline`
- `GET /versions`、`GET /fabric/versions`、`GET /forge/versions`、`POST /download/version`
- `GET /launcher/config`、`PUT /launcher/config`、`POST /launcher/launch`、`GET /launcher/minecraft-dir`、`GET /launcher/installed-versions`

另外保留了一组不带 `/api/v1` 前缀的 legacy 路由，用于向后兼容。

Wails 绑定方法：`Greet`、`TestHealthCheck`、`TestPing`、`TestAPICall`、`GetDBPath`、`GetDBSchema`。

## 与其它项目的关系

- **依赖**外部标准服务，包括 Mojang、BMCLAPI、Fabric、Forge 与 authlib-injector 服务器
- **可以指向** [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)，让启动器使用 HA 的账号体系
- **与** MCA 三个项目没有代码耦合
- **与** [BedwarsRel](/zh/projects/bedwarsrel/) 也没有直接接口关系

### 残留的旧命名

仓库里还留着几个旧名字。

- go module 名仍是 `HRPMLW`
- 前端 package.json 名字仍是 `hrpml-ml`
- README 目录树仍写 `HRPML-Wails/`
- README 内链仍指向 `/home/lnb/HRPML-Wails/...` 这样的绝对路径

## 相关页面

- [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)：启动器可以接入的 authlib-injector 兼容后端
- [MatchCoreArena 客户端](/zh/projects/matchcorearena-client/)：生态里的另一个桌面客户端
