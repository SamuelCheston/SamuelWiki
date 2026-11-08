# HA 服务部署器

HA 服务部署器是 HA 平台的发布后端。它用机器可读的方式告诉运维前端：当前有哪些服务版本可升、该下载哪个二进制；启用编排后，它还亲自执行部署：版本切换、经 Tinyvisor 重启进程、健康与冒烟验证、回滚。

## 覆盖范围

- 一份列出全部服务版本及其产物的版本清单
- 从本地存储目录分发产物
- 数据返回之前先做清单校验
- 可选启用的裸金属与容器编排，由各项目的 `deploy-manifest.yaml` 驱动：前置检查、部署运行、回滚与运行记录
- 一组供运维前端调用的只读 HTTP 接口，外加需要鉴权的部署/回滚变更端点
- 配置模板渲染不属于本服务；容器化栈的配置渲染由 `deploy/` 下的 Compose 模板负责

## 技术栈

- Go 1.25、Gin、goccy/go-yaml
- 无数据库、无中间件，文件系统就是全部存储
- Docker 多阶段构建，运行期镜像使用非 root 用户

## 目录结构

```text
main.go              # 入口、加载 config.yaml、启动 HTTP 服务
internal/config/     # 配置加载、保存、自动生成、版本迁移
internal/models/     # Config 与 Manifest v1 结构、校验规则
internal/server/     # 路由注册与请求处理器
data/                # 运行期数据：manifest.json 与 artifacts/
examples/            # manifest.v1.json 示例
deploy/              # docker-compose 与各服务配置模板
build/               # 编译输出
```

## 运行方式

### 运行前准备

- Go 1.25 工具链
- 一个可写的 `data/` 目录
- 不需要数据库，也不需要外部服务

### 构建

```bash
go build -o ./build/hasd .
```

### 运行

```bash
go run .
```

服务只读取本地文件。

监听端口在两处定义，且互不一致：代码默认值是 `:2770`，Docker 模板与 compose 文件用的是 `:18080`。请自行选定一个，并与维护视图的 `deployer.base_url` 保持一致。

## 配置

服务会在首次启动时自动生成带默认值的 `config.yaml`；当文件版本低于二进制支持的版本时，会按链式规则迁移。

- `version`：配置结构版本
- `server.listen`：监听地址，代码默认值 `:2770`
- `storage.artifacts_root`：产物存储根目录，`./data/artifacts`
- `manifest.path`：清单文件路径，`./data/manifest.json`

清单本身是一份遵循 v1 结构的 JSON 文件。

```json
{
  "schema_version": 1,
  "generated_at": "2026-10-17T06:00:00Z",
  "services": [
    {
      "name": "hrpauth",
      "display_name": "HRPAuth",
      "channel": "stable",
      "version": "1.0.0",
      "published_at": "2026-10-17T05:45:00Z",
      "artifacts": [
        {
          "id": "linux-amd64-binary",
          "role": "binary",
          "os": "linux",
          "arch": "amd64",
          "file_name": "HRPAuth",
          "download_path": "release/linux-amd64/HRPAuth",
          "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          "size_bytes": 28753920
        }
      ]
    }
  ]
}
```

清单在返回前会做校验：服务名必须唯一且为小写，产物 id 在同一服务内必须唯一，`role` 只能是 `binary`、`archive` 或 `asset`，`sha256` 必须是 64 位小写十六进制字符串，`download_path` 不能越出该服务的产物根目录。

## HTTP 接口

所有响应统一使用 `{success, message, data}` 信封结构。

- `GET /healthz`
- `GET /api/v1/healthz`
- `GET /api/v1/manifest`：返回完整清单
- `GET /api/v1/projects`：只保留二进制产物的清单视图
- `GET /api/v1/artifacts/:service/*filepath`：下载单个产物

产物路径在打开文件前会经过 `filepath.Clean` 与 `..` 前缀检查，因此请求无法越出该服务的产物根目录。

启用编排后，新增以下接口。只读端点不鉴权；变更端点必须携带 `X-Deploy-Token`，未配置令牌时一律 fail-closed（503）。

- `GET /api/v1/deploy/manifests`：聚合后的项目清单
- `GET /api/v1/deploy/validate`：聚合校验报告
- `GET /api/v1/deploy/status`：声明态与实际态对照
- `GET /api/v1/deploy/preflight`：一次性分级前置检查报告
- `GET /api/v1/deploy/runs`、`GET /api/v1/deploy/runs/:id`：运行记录
- `POST /api/v1/deploy/run`：发起一次部署运行
- `POST /api/v1/deploy/rollback`：一键回滚

## 与其它项目的关系

- **被消费于** [HA 服务维护视图](/zh/projects/ha-services-maintenanceview/)，通过它的 `deployer.base_url` 接入
- **驱动** Tinyvisor 完成裸金属运行中的重启；进程仍由 Tinyvisor 监督，不归本服务
- **不使用** HRPAuth 的微服务扩展层，只读取自己的 `data/manifest.json`
- **遵循** [HA-Contract](/zh/projects/ha-contract/) 中的版本清单契约；契约记录位于本仓 `knowledge/0006-version-manifest.md`
- manifest v1 明确不负责首次部署初始化，也不负责配置模板渲染

## 相关页面

- [部署编排](/zh/game/deployment)：清单模型、两种运行时、回滚与凭据语义
- [容器编排](/zh/projects/ha-services-deployer/container-orchestration)：运行整个平台的 Compose 模板
- [HA 服务维护视图](/zh/projects/ha-services-maintenanceview/)：消费这份清单的前端
- [HA-Contract](/zh/projects/ha-contract/)：版本清单契约
- [HRPAuth](/zh/projects/hrpauth/)：清单中可以描述的服务之一
