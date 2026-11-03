# HA 服务部署器

HA 服务部署器是 HA 平台的版本清单与产物分发后端。它用机器可读的方式告诉运维前端：当前有哪些服务版本可升、该下载哪个二进制。

## 覆盖范围

- 一份列出全部服务版本及其产物的版本清单
- 从本地存储目录分发产物
- 一组只读的 HTTP 接口，供运维前端调用
- 数据返回之前先做清单校验
- 仅此而已：不做部署、不控制进程、不渲染配置模板

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

监听端口在三处定义，且互不一致：代码默认值是 `:2770`，`config.example.yaml` 写的是 `:2771`，Docker 模板与 compose 文件用的是 `:18080`。请自行选定一个，并与维护视图的 `deployer.base_url` 保持一致。

## 配置

把 `config.example.yaml` 复制为 `config.yaml`。文件不存在时服务会在启动时写入默认配置；当文件版本低于二进制支持的版本时，会按链式规则迁移。

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

## 与其它项目的关系

- **被消费于** [HA 服务维护视图](/zh/projects/ha-services-maintenanceview/)，通过它的 `deployer.base_url` 接入
- **不使用** HRPAuth 的微服务扩展层，只读取自己的 `data/manifest.json`
- **遵循** [HA-Contract](/zh/projects/ha-contract/) 中的版本清单契约，文档位于 `docs/dev/HA-Services-Deployer/version-manifest.md`
- manifest v1 明确不负责首次部署初始化，也不负责配置模板渲染

## 相关页面

- [HA 服务维护视图](/zh/projects/ha-services-maintenanceview/)：消费这份清单的前端
- [HA-Contract](/zh/projects/ha-contract/)：版本清单契约
- [HRPAuth](/zh/projects/hrpauth/)：清单中可以描述的服务之一
