# HA 服务维护视图

HA 服务维护视图是 HA 部署管理 WebUI 的浏览器侧宿主。它托管 React 前端、代理部署器（含其编排面），并负责各服务的首次配置初始化。

## 覆盖范围

- 从 `frontend/dist` 提供编译好的 React 前端
- 把版本与产物查询代理到 HA 服务部署器
- 把部署器的编排面（清单、校验、状态、运行记录、部署、回滚）代理给浏览器，部署凭据由服务端持有，浏览器接触不到
- 运维人员会话登录，复用现有运维身份（部署令牌）；未配置令牌时保持免登录模式
- 把各项目的部署设置（部署目录、端口）保存在本地 JSON 文件里
- 把远端清单与本地部署状态合并成一份项目列表
- 通过运行目标二进制并改写生成的 YAML 来完成服务初始化

## 技术栈

- 后端：Go 1.25、Gin、goccy/go-yaml，用 `os/exec` 调用目标二进制
- 前端：React 19、TypeScript、Vite 7，不使用 UI 库与路由库；界面由少量视图组成（`App.tsx`、`BootstrapView.tsx`、`OrchestrationView.tsx`）
- 无数据库，状态落在 `data/projects.json`

## 目录结构

```text
main.go                            # 入口，装配配置、部署器客户端、状态存储与路由
internal/config/                   # 配置加载、保存、版本迁移
internal/models/                   # Config、项目设置与远端项目模型
internal/deployer/client.go        # 部署器 HTTP 客户端，10 秒超时，解开信封里的 data
internal/state/store.go            # 本地 projects.json 读写
internal/server/router.go          # 路由注册与静态文件回退
internal/server/handlers.go        # 请求处理器
internal/server/bootstrap_specs.go # 各项目的默认端口与配置字段表
internal/server/bootstrap_runtime.go # 执行二进制生成默认配置并改写 YAML
frontend/                          # React 源码与 dist 产物
```

## 运行方式

### 运行前准备

- 一个正在运行的 [HA 服务部署器](/zh/projects/ha-services-deployer/)，必须先启动它
- 后端需要 Go 1.25
- 前端需要 Node.js 与 npm
- 前端必须先构建，否则后端无法提供界面

### 构建

后端：

```bash
go build -o ./build/hasmv .
```

前端：

```bash
cd frontend
npm install
npm run build
```

### 运行

后端：

```bash
go run .
```

前端开发服务器：

```bash
cd frontend
npm install
npm run dev
```

Vite 开发服务器监听 `5173` 端口，并把 `/api` 与 `/healthz` 代理到后端。

监听端口在多处定义。代码默认值是 `:2771`，而随仓库发布的 `config.yaml` 与 Docker 镜像用的是 `:18081`。Vite 开发代理指向 `http://127.0.0.1:18081`，因此前端开发时后端必须跑在那个端口上。

## 配置

把 `config.example.yaml` 复制为 `config.yaml`。文件不存在时会在启动时写入默认配置；版本较旧时会按链式规则逐版迁移。

- `version`：配置结构版本
- `server.listen`：监听地址，代码默认值 `:2771`
- `server.public_base_url`：浏览器访问本服务使用的地址
- `server.frontend_dist`：前端构建产物目录，`./frontend/dist`。目录缺失时服务返回 `503`，并提示先构建前端
- `deployer.base_url`：部署器地址，`http://127.0.0.1:18080`
- `deployer.token`：部署器部署令牌，同时作为面板登录密码。令牌由服务端持有：代理在转发变更请求时注入它。留空时面板保持免登录行为，部署/回滚触发一律 fail-closed（503）
- `state.projects_path`：本地设置文件路径，`./data/projects.json`

端口必须落在 1 到 65535 之间，并且在全部项目之间唯一。唯一性检查同时覆盖本地已保存的项目与部署器上报的项目。

## HTTP 接口

- `GET /healthz`
- `GET /api/healthz`
- `GET /api/session` · `POST /api/session/login` · `POST /api/session/logout`
- `GET /api/config`（已脱敏：不返回令牌内容）
- `GET /api/projects`：远端清单与本地部署设置的合并结果
- `PUT /api/projects/:name/deployment`：保存部署目录与端口
- `POST /api/projects/:name/precheck`：初始化前检查部署目录与端口
- `POST /api/projects/:name/initialize`：生成首次配置
- `GET /api/deployer/healthz`
- `GET /api/deployer/manifest`
- `GET /api/request-log`
- `GET /api/orchestration/manifest` · `GET /api/orchestration/validation` · `GET /api/orchestration/status`
- `GET /api/orchestration/runs` · `GET /api/orchestration/runs/:id`
- `POST /api/orchestration/deploy` · `POST /api/orchestration/rollback`

注册在会话中间件之后的路由，在配置了 `deployer.token` 时要求有效会话。这里代理的编排结构遵循部署器的编排契约；未配置 `deployer.token` 时，变更类路由返回 503。

没有命中任何路由的路径会先在 `frontend/dist` 里按静态文件查找，找不到则回退到 `index.html`，由单页前端自行处理路由。

## 编排区

编排区展示什么，完全由各项目的 `deploy-manifest.yaml` 声明决定，经部署器聚合：

- 项目列表就是聚合后的清单；清单装载错误以警告横幅原文显示，不被隐藏。
- 一个项目是否可部署纯看清单声明：由 Tinyvisor 管理进程且种类不是 external（`frontend/src/api.ts::isDeployable`）。面板管理、人工管理与 external 条目作为只读事实展示。
- 没有任何清单声明 = 编排区为空；浏览器端不发明任何内容。

## 初始化支持

`bootstrap_specs.go` 目前登记三个项目。

- `hrpauth`，默认端口 `2778`
- `hrpauth-yggdrasil-api`，默认端口 `2770`
- `haskinproxy`，默认端口 `2702`

初始化会先运行下载到的二进制，让它写出自己的默认配置，再改写其中的监听地址、自身 URL 字段与依赖服务 URL。名单之外的项目会显示在界面上，但无法执行初始化。

## 与其它项目的关系

- **依赖** [HA 服务部署器](/zh/projects/ha-services-deployer/)，通过 `deployer.base_url` 接入
- **与** HRPAuth 的微服务扩展层无关
- **负责初始化** [HRPAuth](/zh/projects/hrpauth/)、[HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 与 [HASkinProxy](/zh/projects/haskinproxy/)，因此它知道这些服务的配置文件名、默认端口与跨服务 URL 字段

## 相关页面

- [运维面板](/zh/game/operations-panel)：本服务的运维视角页面
- [HA 服务部署器](/zh/projects/ha-services-deployer/)：它所代理的清单与产物后端
- [HRPAuth](/zh/projects/hrpauth/)：它能够初始化的项目之一
- [HASkinProxy](/zh/projects/haskinproxy/)：它能够初始化的项目之一
