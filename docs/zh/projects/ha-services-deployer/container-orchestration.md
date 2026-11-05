# 容器编排

HA 平台以一组容器运行。一个 Compose 模板编排全部后端服务，每个服务仓库自带用于构建自身镜像的 Dockerfile。

本页描述该模板：它存放在哪里、镜像如何构建、配置如何注入服务，以及平台依赖哪些外部组件。

## 模板位置

编排模板**不**存放在契约仓库中，而是位于部署器仓库，因为该服务本身就负责发布分发与部署相关事务：

- 模板：[`CoreMatch/HA-Services-Deployer/deploy/docker-compose.yml`](https://github.com/CoreMatch/HA-Services-Deployer/blob/main/deploy/docker-compose.yml)
- 配置模板：[`CoreMatch/HA-Services-Deployer/deploy/config/`](https://github.com/CoreMatch/HA-Services-Deployer/tree/main/deploy/config)
- 环境变量模板：[`CoreMatch/HA-Services-Deployer/deploy/.env.example`](https://github.com/CoreMatch/HA-Services-Deployer/blob/main/deploy/.env.example)

## 仓库结构

Compose 文件位于部署器仓库的 `deploy/` 目录，其构建上下文指向**同级仓库**：

```text
HA-Services-Deployer/
├── Dockerfile                     # 部署器服务自身的镜像
├── deploy/
│   ├── docker-compose.yml        # 编排模板
│   ├── .env.example              # 模板消费的全部环境变量
│   ├── config/*.yaml.tmpl        # 各服务的配置模板
│   ├── secrets/                  # 签名密钥对（被 git 忽略）
│   └── sdkhandler-template/      # 可选的前端模板挂载点（被 git 忽略）
├── ../HRPAuth/                   # 同级检出目录，用作构建上下文
├── ../HRPAuth-Yggdrasil-API/
├── ../HASkinLib/
├── ../HASkinProxy/
├── ../WinnerProxy/
├── ../MatchCoreArena-Server/
├── ../HA-WebUI-SDKHandler/
└── ../HA-Services-MaintenanceView/
```

由于构建上下文是相对路径（`../HRPAuth` 等），各服务必须与部署器仓库**同级检出**，才能构建整个栈。只单独克隆部署器仓库足以阅读契约，但不足以执行 `docker compose build`。

## 服务清单

| Compose 服务 | 仓库 | 镜像 | 容器端口 | 配置模板 |
|---|---|---|---|---|
| `hrpauth` | [CoreMatch/HRPAuth](https://github.com/CoreMatch/HRPAuth) | `ha/hrpauth` | 2778 | `config/hrpauth.yaml.tmpl` |
| `hrpauth-yggdrasil-api` | [CoreMatch/HRPAuth-Yggdrasil-API](https://github.com/CoreMatch/HRPAuth-Yggdrasil-API) | `ha/hrpauth-yggdrasil-api` | 2770 | `config/hrpauth-yggdrasil-api.yaml.tmpl` |
| `haskinlib` | [CoreMatch/HASkinLib](https://github.com/CoreMatch/HASkinLib) | `ha/haskinlib` | 2701 | `config/haskinlib.yaml.tmpl` |
| `haskinproxy` | [CoreMatch/HASkinProxy](https://github.com/CoreMatch/HASkinProxy) | `ha/haskinproxy` | 2702 | `config/haskinproxy.yaml.tmpl` |
| `winnerproxy` | [CoreMatch/WinnerProxy](https://github.com/CoreMatch/WinnerProxy) | `ha/winnerproxy` | 2777 | `config/winnerproxy.yaml.tmpl` |
| `mca-server` | [CoreMatch/MatchCoreArena-Server](https://github.com/CoreMatch/MatchCoreArena-Server) | `ha/mca-server` | 9178 | `config/mca-server.yaml.tmpl` |
| `ha-webui-sdkhandler` | [CoreMatch/HA-WebUI-SDKHandler](https://github.com/CoreMatch/HA-WebUI-SDKHandler) | `ha/ha-webui-sdkhandler` | 2704、2705 | `config/sdkhandler.yaml.tmpl` |
| `ha-services-deployer` | [CoreMatch/HA-Services-Deployer](https://github.com/CoreMatch/HA-Services-Deployer) | `ha/ha-services-deployer` | 18080 | `config/ha-services-deployer.yaml.tmpl` |
| `ha-services-maintenance-view` | [CoreMatch/HA-Services-MaintenanceView](https://github.com/CoreMatch/HA-Services-MaintenanceView) | `ha/ha-services-maintenance-view` | 18081 | `config/ha-services-maintenance-view.yaml.tmpl` |
| `ha-webui-nginx` | —（官方 `nginx:1.27-alpine`） | `nginx:1.27-alpine` | 8080 | `nginx-sdkhandler-artifacts.conf`（挂载） |

`ha-webui-nginx` 是可选项：它属于 `webui` profile（`docker compose --profile webui up -d`），从 `sdkhandler-artifacts` 卷提供 HA WebUI SDK 处理器发布的产物，并带 SPA 回退到 `index.html`。它就是 `serve_artifacts: false` 设计中托管产物的外部 Web 服务器。

主机端口通过 `${PORT}` 变量发布，默认值即上表数值，每一项都可在 `.env` 中覆盖。

`BS2HA` 同样有容器化版本，但它是一次性迁移 CLI，不是常驻服务，因此不属于 Compose 栈。需要时按需运行：

```bash
docker build -t ha/bs2ha ../BS2HA
docker run --rm -v "$PWD:/work" ha/bs2ha
```

## 镜像构建

每个服务镜像都在各自仓库中，由多阶段 `Dockerfile` 在本地构建：

- 构建阶段：`golang:<version>-alpine`，`CGO_ENABLED=0`，`go build -trimpath -ldflags="-s -w"`。
- 运行阶段：`alpine:3.22`，非 root 用户（uid 10001），并安装 `ca-certificates`、`tzdata` 与 `gettext`（供 `envsubst` 使用）。

两个服务需要额外构建阶段：

- **HA 服务维护视图** 在 `node:22-alpine` 阶段构建其 React 前端；编译产物 `frontend/dist` 会复制到二进制旁边，因为服务端在运行期从磁盘读取该目录。
- **HA WebUI SDK 处理器** 在**运行期**编译前端，因此其运行镜像内置 `nodejs`、`npm` 与 `git`。

镜像标签为 `ha/<service>:${VERSION}`，`VERSION` 默认为 `latest`。

## 配置注入

服务读取的是 YAML 配置文件，而不是环境变量。为了让运行环境能够提供作用域相关取值（数据库地址、上游 URL、密钥），每个服务镜像都带有入口脚本，在启动二进制之前先渲染模板：

```sh
envsubst < "${CONFIG_TEMPLATE}" > "${RENDERED_CONFIG}"
exec "$@"
```

模板位于 `deploy/config/*.yaml.tmpl`，使用 `${VAR}` 占位符。数值刻意不加引号，因为服务按整数而非字符串解析它们。

渲染后的文件位置因服务而异，取决于各服务解析配置的方式：

| 服务 | 配置路径 | 机制 |
|---|---|---|
| `HRPAuth`、`HASkinLib`、`HA 服务部署器`、`HA 服务维护视图` | `/app/config.yaml` | 相对于工作目录 |
| `HRPAuth-Yggdrasil-API`、`HASkinProxy` | `/app/config.yaml` | 位于可执行文件旁 |
| `WinnerProxy` | `/app/config.yml` | 位于可执行文件旁（是 `config.yml`，不是 `config.yaml`） |
| `MatchCoreArena-Server` | `/app/config/config.yaml` | `CONFIG_PATH` 环境变量 |
| `HA WebUI SDK 处理器` | `/app/config.yaml` | `SDKHANDLER_CONFIG` 环境变量 |

## 外部依赖

MySQL 与 Redis **不在** Compose 栈内启动，预期它们已经存在，并通过环境变量访问：

| 变量 | 含义 |
|---|---|
| `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` | MySQL 连接 |
| `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`、`REDIS_DB` | Redis 连接 |

`DB_PORT` 的消费方式：三个服务都有独立的 `database.port` 字段，模板把 `host` 与 `port` 分开渲染。内联 `ip:port` 写法仍然兼容——设置了 `port` 时，内联部分会被剥掉。`MatchCoreArena-Server` 读取自己的端口设置。

服务之间的互联使用 Compose 服务名：

| 变量 | 解析结果 |
|---|---|
| `HRPAUTH_URL` | `http://hrpauth:2778` |
| `HRPAUTH_YGG_URL` | `http://hrpauth-yggdrasil-api:2770/yggdrasil-api/` |
| `DEPLOYER_URL` | `http://ha-services-deployer:18080` |

## 密钥

| 密钥 | 位置 | 使用方 |
|---|---|---|
| `private_key.pem`、`public_key.pem` | `deploy/secrets/`（被 git 忽略） | `HRPAuth`、`HRPAuth-Yggdrasil-API` |
| `MANAGE_TOKEN` | `.env` | `HRPAuth` 管理接口 |
| `HRPAUTH_SUPER_CLIENT_SECRET`、`*_CLIENT_SECRET` | `.env` | 各卫星服务的 OAuth2 客户端凭据 |
| `SMTP_PASSWORD` | `.env` | `HRPAuth` 邮件投递 |

`deploy/secrets/` 与 `deploy/.env` 均被排除出版本控制，`deploy/secrets` 也被排除在 Docker 构建上下文之外，因此私钥不会进入任何镜像层。

## 运行整个栈

```bash
cd HA-Services-Deployer/deploy
cp .env.example .env      # 然后修改数据库、Redis、OAuth 与 SMTP 相关取值
docker compose up -d --build
docker compose ps
docker compose logs -f hrpauth
```

使用 `docker compose down` 停止并移除整个栈。具名卷（`hrpauth-data`、`hrpauth-cache`、`haskin-textures`、`mca-data`、`sdkhandler-artifacts`；`hrpauth-storage` 为迁移保留、已废弃）保存上传内容、材质与服务状态，在 `down` 之后依然保留。

## 限制

- 整个栈要求各服务仓库与部署器仓库同级检出，构建上下文不是可直接下载的产物。
- 模板只支持通过环境变量渲染配置。服务自身结构中写死的字段无法被覆盖。
- **HA WebUI SDK 处理器** 只在轮询到的 SDK 列表 ETag 变化（或强制触发）时才完整构建一次前端，因此其容器需要访问模板仓库与 npm registry 的出站网络。

## 相关页面

- [HA 服务部署器](/zh/projects/ha-services-deployer/)：拥有该编排模板的服务
- [HA 服务维护视图](/zh/projects/ha-services-maintenanceview/)：运行中栈的运维控制台
- [HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/)：构建前端产物的服务
