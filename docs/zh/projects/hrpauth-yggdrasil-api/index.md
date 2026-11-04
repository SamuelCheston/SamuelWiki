# HRPAuth Yggdrasil API

HRPAuth-Yggdrasil-API 是一个独立的 Minecraft 认证服务，实现 Yggdrasil 协议。它向游戏客户端和 authlib-injector 提供会话、档案与纹理能力，并通过 OAuth2 与 HRPAuth 核心对接完成账号校验。

## 覆盖范围

- 面向游戏客户端的 Yggdrasil 认证、令牌刷新与会话加入
- 与核心账号绑定的游戏账号与 Minecraft 档案
- 皮肤与披风的存储，通过带签名的 `textures` 资料属性对外分发
- 面向 Web UI 的 Mojang 账号绑定与游戏档案创建
- 一份把 Yggdrasil 页面注入核心 Web UI 的 WebUI SDK 包

## 技术栈

- Go 1.26.4、Gin v1.12
- GORM 以 MySQL 为主存储；模块内同时保留了 sqlite driver
- golang-migrate 负责数据库迁移，go-redis/v9 负责限流与缓存
- golang.org/x/oauth2 的 client credentials 模式对接 HRPAuth 核心
- HugoSmits86/nativewebp 生成 WebP 纹理预览图
- 来自 `crypto/rsa` 的 RSA 密钥对，用于签名纹理属性

## 目录结构

```text
main.go        # 入口、路由注册、后台任务
config/        # 配置解析、版本迁移、运行期元信息
controllers/   # Yggdrasil、注册、代理、玩家与清理处理器
services/      # 认证、玩家、纹理、档案密钥、皮肤头像、绑定超时
clients/       # 调用 HRPAuth 核心的 HTTP 客户端
utils/         # 核心 API 客户端与通用辅助函数
models/        # GORM 模型
database/      # 数据库连接与 SQL 迁移
redis/         # Redis 客户端
sdk/           # 内嵌的 WebUI SDK 包
build/         # 编译产物
```

## 运行方式

### 运行前准备

- MySQL，需提前创建好数据库与用户
- Redis
- 一个运行中的 HRPAuth 核心，用于账号校验与 WebUI 集成
- 二进制同目录下可写的目录，用于存放 `config.yaml` 与密钥对

没有核心服务时，只有内部登记的代理账号可以登录。

### 构建

```bash
./build.sh
```

`build.sh` 等价于 `go build -o ./build/HAygg`。

### 运行

```bash
./build/HAygg
```

首次运行会在二进制同目录生成 `config.yaml` 与 RSA 密钥对（`public_key.pem` 和 `private_key.pem`），执行数据库迁移，并在 `:2770` 开始监听。

验证一下：

```bash
curl http://localhost:2770/
```

返回的是 JSON，其中包含 `"status": "online"`。

Docker 镜像内不含 `config.yaml`。请把它挂载到 `/app/config.yaml`，或设置 `CONFIG_TEMPLATE` 与 `RENDERED_CONFIG`，在容器启动时用 envsubst 模板渲染配置。纹理文件落在 `/app/storage`。

## 配置

`config.yaml` 位于二进制同目录。首次运行时按默认值生成；当文件 `version` 低于当前二进制支持的版本时，先备份原文件，再逐版迁移到当前版本 `4`（v4 新增 `database.port`；历史上短暂存在的 v4 `manage.token` 步骤已回退，配置文件里多余的 `manage` 段会被忽略）。

- `server`：监听端口与 CORS 来源
- `site`：对外展示的名称与版本
- `callback`：用于拼接纹理 URL 的公网基址
- `core_api`：核心地址与 OAuth2 客户端凭据
- `database`：MySQL 连接与表前缀
- `redis`：Redis 连接与键前缀
- `microservice`：服务名、心跳 TTL、relay 地址与 relay 路径前缀
- `yggdrasil`：元信息、安全上限与功能开关
- `security`：登录限流配置

本服务没有独立的配置文档，仓库里的 `config.yaml` 与 `config/config.go` 就是参考。

## 与其它项目的关系

- **依赖** [HRPAuth](/zh/projects/hrpauth/)，获取账号校验、OAuth2 令牌与站点元信息
- **向核心注册** 为微服务，由核心把 `/yggdrasil-api` 的流量中继过来
- **投递** 一份 WebUI SDK 包，由 [HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/) 聚合进 WebUI 构建
- **提供** [HASkinProxy](/zh/projects/haskinproxy/) 所调用的上游路由
- **遵循** [HA-Contract](/zh/projects/ha-contract/) 中定义的契约

## 相关页面

- [架构说明](/zh/projects/hrpauth-yggdrasil-api/architecture)：一个请求在服务内部如何流转
- [接口参考](/zh/projects/hrpauth-yggdrasil-api/api)：协议接口、业务接口与错误格式
