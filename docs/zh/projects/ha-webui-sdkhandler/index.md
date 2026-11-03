# HA WebUI SDK 处理器

HA WebUI SDK 处理器是前端的编译期 SDK 聚合器。它从 HRPAuth 主服务拉取 SDK 源码包，把它们注入前端模板，编译出结果并发布静态产物。

## 覆盖范围

- 用基于 ETag 的增量请求轮询 HRPAuth 主服务的 SDK 包列表
- 下载 SDK 源码压缩包并解包到一次性工作目录
- 为前端生成 SDK 清单、路由、导航栏、控制台与资料卡片文件
- 把 SDK 依赖深合并进模板的 `package.json`
- 在超时保护下执行 `npm install`、`tsc -b` 与 `vite build`，随后原子发布产物

## 技术栈

- Go 1.25、Gin、yaml.v3
- 运行期需要 Node.js、npm 与 git，真正的编译由前端工具链完成
- 无数据库，构建历史落在 `state/builds.json`

## 目录结构

```text
main.go                      # 单文件主程序：路由、轮询协程、构建编排
internal/config/             # 配置加载、v3 到 v4 迁移、原子保存与备份
internal/broker/broker.go    # HRPAuth 客户端：OAuth2 取 token，用 ETag 轮询 /services/sdk-packages
internal/inject/             # 解包、路径安全检查、依赖合并、生成前端文件
internal/build/build.go      # npm install、tsc -b、vite build
internal/publish/publish.go  # 构建产物的原子发布
internal/state/state.go      # 构建历史
```

本仓库没有 `frontend/` 目录。前端模板来自外部仓库，`build.template_git_url` 默认指向 HRPAuth-WebUI，运行期再把它拉到 `build.template_dir`。

注入阶段会在编译前向模板写入这些文件：

```text
sdk-manifest.ts
sdk-routes.tsx
sdk-navbar.tsx
sdk-dashboard.tsx
sdk-critical-operations.ts
sdk-profile-cards.tsx
```

## 运行方式

### 运行前准备

- 一个正在运行的 [HRPAuth](/zh/projects/hrpauth/) 主服务，以及一个 Ops 级 OAuth2 客户端
- 前端模板仓库，模板目录为空时会自动克隆
- Node.js、npm 与 git
- 可写的工作目录与产物目录

### 构建

```bash
go build -o ./build/sdkhandler .
```

### 运行

```bash
./sdkhandler
```

主服务监听 `:2704`，维护服务监听 `:2705`。配置路径默认为 `./config.yaml`，可以用环境变量 `SDKHANDLER_CONFIG` 覆盖。

## 配置

- `version`：配置结构版本，当前为 `4`
- `server.listen_addr`：主监听地址，`:2704`
- `server.maintenance_addr`：维护监听地址，`:2705`
- `hrpauth.base_url`：HRPAuth 主服务地址，`http://127.0.0.1:2778`
- `hrpauth.client_id`：OAuth2 客户端 ID，必填，缺失时服务直接启动失败
- `hrpauth.client_secret`：OAuth2 客户端密钥，必填
- `hrpauth.poll_interval_seconds`：SDK 列表轮询间隔，`60`
- `build.template_dir`：前端模板路径
- `build.template_git_url`：模板仓库，模板目录为空时自动克隆
- `build.work_dir`：工作目录，每次运行都会重建
- `build.artifacts_dir`：带版本号的产物根目录
- `build.current_link`：当前生效产物的指针
- `build.npm_command`：npm 可执行文件，`npm`
- `build.ignore_scripts_default`：默认以 `--ignore-scripts` 安装，除非包自己声明需要执行脚本，`true`
- `build.npm_blacklist`：精确包名，命中即本次构建失败
- `build.template_poll_interval_seconds`：自动拉取模板的间隔，`0` 表示不自动拉取
- `build.build_timeout_seconds`：单次构建整体超时，`1200`
- `state_dir`：状态目录，存放 `builds.json` 与下载缓存
- `serve_artifacts`：是否由本服务托管已发布产物，默认关闭

相对路径以配置文件所在目录为基准解析，而不是以启动时的当前目录为基准。示例文件与代码默认值在 `build.artifacts_dir` 和 `build.current_link` 上并不一致，发布前请以实际使用的文件为准。

## 构建管线

- 模板被完整复制到全新的工作目录，模板本身保持只读
- SDK 压缩包解包到该工作目录，并做路径检查，拒绝越出目标目录的条目
- SDK 依赖被深合并进模板的 `package.json`
- 构建依次执行 `npm install`、`tsc -b` 与 `vite build`；如果模板声明了自己的 `build` 脚本则走该脚本
- 依赖命中 `build.npm_blacklist` 时构建直接失败，与脚本策略无关
- 产物先复制到临时目录再 rename 覆盖目标目录，因此构建失败时上一版仍然在线

## HTTP 接口

主端口：

- `GET /health`
- `GET /api/build/status`
- `POST /api/build/trigger`
- `GET /api/revision`

开启 `serve_artifacts` 后，本服务还会托管已发布的静态产物。

维护端口，所有路由都要求 Ops 级 Bearer 令牌：

- `POST /api/maintenance/template/pull`
- `GET /api/maintenance/sdk/list`

## 与其它项目的关系

- **是** [HRPAuth](/zh/projects/hrpauth/) 扩展层中 `/services/sdk-packages` 这组接口的**唯一消费者**
- **不使用** `/services/presence` 与 `/services/relay`，那两组属于 [HASkinProxy](/zh/projects/haskinproxy/)、[WinnerProxy](/zh/projects/winnerproxy/) 与 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)
- **只信任**主服务，绝不直接访问卫星服务
- **编译**位于外部仓库 HRPAuth-WebUI 的前端模板

## 相关页面

- [HRPAuth](/zh/projects/hrpauth/)：它唯一对接的 SDK 来源
- [HRPAuth Web](/zh/projects/hrpauth-web/)：与前端模板相关的 Web 端项目
- [HA-Contract](/zh/projects/ha-contract/)：SDK 包契约
