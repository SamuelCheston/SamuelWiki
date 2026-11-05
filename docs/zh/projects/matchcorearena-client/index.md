# MatchCoreArena 客户端

MatchCoreArena 客户端是 MatchCoreArena 服务的跨平台桌面客户端。它为登录、好友、战队、排行榜与对局历史提供图形界面。

## 覆盖范围

- 账号登录、TOTP 验证、令牌刷新与登出
- 好友列表，支持发送、接受、拒绝与删除
- 战队创建、成员角色与解散
- 赛季排行榜，包含榜单与自己的排名
- 上报对局结果与查看自己的对局历史
- 没有本地数据库，也没有中间件，所有操作都是发往服务端的 HTTP 调用

### 后端路由与绑定

前端不直接发起 HTTP 请求。它调用 Wails 绑定的 Go 方法，这些方法再转发给服务层。

- 认证：`/api/auth/login-ticket`、`/api/auth/totp-verify`、`/api/auth/refresh`、`/api/auth/logout`
- 用户：`/api/users/me`、`/api/users/{uuid}`、`/api/users/me/experience`
- 好友：`/api/friends`、`/api/friends/{id}/accept`、`/api/friends/{id}/reject`、`/api/friends/{id}`
- 战队：`/api/teams`、`/api/teams/{id}`、`/api/teams/{id}/members`、`/api/teams/{id}/members/{uuid}/role`
- 对局：`/api/matches`、`/api/matches/{id}`、`/api/matches/me`
- 排行榜：`/api/rankings/{type}`、`/api/rankings/me`

每个请求都带上 `Content-Type: application/json`，设置令牌之后再加上 `Authorization: Bearer <token>`。HTTP 客户端超时 10 秒。

## 技术栈

- Go 1.25 与 Wails v2.15，负责桌面外壳与 Go 到 JavaScript 的绑定
- 前端使用 React 19、TypeScript、Vite 6、Material UI v9 与 ESLint 9
- 客户端自身不保存任何持久状态，只读取 `config.json`，其余全部交给服务端

### 已知的文档不一致

README 有三处已经和代码脱节。

- README 写 MIT，`package.json` 声明的是 `AGPL-3.0`，`LICENSE` 文件也是 AGPL 正文
- README 的技术栈表写 Material UI v6，实际依赖是 v9
- README 的技术栈表写 Gin，`go.mod` 里没有 Gin 依赖，代码也从未使用

## 目录结构

```text
app.go                       # Wails 绑定方法，每个业务动作一个
main.go                      # Wails 启动与前端资源内嵌
wails.json                   # Wails 项目配置
Makefile                     # dev、build、install 与 check 目标
start.sh                     # 环境检查、依赖安装、首次运行初始化
config.example.json          # ~/.matchcorearena/config.json 的模板
Dockerfile                   # 桌面二进制的容器镜像
docker-compose.yml           # 容器运行定义
internal/config/             # 读写 ~/.matchcorearena/config.json
internal/handlers/app.go     # 聚合层，把调用转发给各个 service
internal/models/             # auth、common、friend、match、ranking、team、user 模型
internal/services/           # HTTP 客户端层，api.go 基类加各业务 service
frontend/src/                # LoginView、HomeView、FriendList、RankingView，以及 App.tsx 的抽屉导航
frontend/wailsjs/            # Wails 生成的 Go 到 JavaScript 绑定
build/                       # 打包资源，产物落在 build/bin/
.github/workflows/           # build.yml、codeql.yml、release.yml
```

## 运行方式

### 运行前准备

- Go 1.25 或更高版本
- Node.js 18 或更高版本
- Wails CLI：`go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### 构建

```bash
make install
make build
```

`make install` 会执行 `go mod tidy` 并安装前端依赖。`make build` 执行 `wails build`，产物是 `build/bin/MatchCoreArenaClient`。

### 运行

```bash
./start.sh
```

`start.sh` 会检查 Go、Node 与 Wails CLI，缺少 CLI 时自动安装；首次运行会从模板创建 `~/.matchcorearena/config.json`，然后执行 `wails dev`。

桌面应用自身不占用端口。Vite dev server 监听 5173，并且开启了 `strictPort`。

CI 会跑 `go test ./...`、`npm run typecheck`、`npm run lint`、`npm run build` 与 `wails build`。

## 配置

配置保存在 `~/.matchcorearena/config.json`，模板是 `config.example.json`。

- `server_url`：MatchCoreArena 服务端地址，默认 `https://arena.mcnb.dev/`（示例默认地址）
- `debug`：调试开关，默认 `false`

`.env.example` 与 `docker-compose.yml` 里也声明了 `SERVER_URL` 和 `DEBUG`。但 `internal/config/config.go` 的加载器只读 JSON 文件，因此当前版本里这两个环境变量不会生效。

## 与其它项目的关系

- **依赖** [MatchCoreArena 服务端](/zh/projects/matchcorearena-server/)，它是唯一的后端
- **与** [BedwarsRel](/zh/projects/bedwarsrel/) 没有直接调用关系，Bedwars 数据要先经服务端落到 MySQL，才会体现在这个客户端的排行榜与对局历史里
- **消费** [HA-Contract](/zh/projects/ha-contract/)，它调用的业务接口以契约为准

## 相关页面

- [MatchCoreArena 服务端](/zh/projects/matchcorearena-server/)：这个客户端背后的服务
- [HA-Contract](/zh/projects/ha-contract/)：所有业务路由必须遵守的契约
