# HRPAuth

HRPAuth 是 HA 生态的核心验证服务。同一个二进制同时提供 OAuth2 业务接口和 Yggdrasil API。

## 覆盖范围

- 面向 Web UI 和第三方客户端的 OAuth2 授权
- Yggdrasil 认证、会话、资料与纹理分发
- 账号注册、邮箱验证、TOTP 与 WebAuthn 通行密钥
- 纹理上传与分发
- 面向卫星服务的微服务扩展层

## 技术栈

- Go 1.26+、Gin、GORM
- MySQL 存放账号、会话与令牌
- Redis 存放验证码、邮箱验证码与限流计数

## 目录结构

```text
main.go        # 入口、路由注册、后台任务
config/        # 配置加载与版本迁移
controllers/   # HTTP 处理器
services/      # 业务逻辑
models/        # GORM 模型
database/      # 数据库连接与 SQL 迁移
redis/         # Redis 客户端
registry/      # 服务在线状态与心跳 worker
utils/         # 公共辅助函数
build/         # 预编译产物与运行期配置
```

## 运行方式

### 运行前准备

- MySQL
- Redis
- 一个可写的项目目录，用于生成 `config.yaml` 与签名密钥文件

### 构建

```bash
go build -o ./build/hrpauth
```

### 运行

```bash
./build/hrpauth
```

首次运行会自动生成 `config.yaml`、执行数据库迁移、创建签名密钥对，并在 `:2778` 启动 HTTP 服务。

## 配置

`config.yaml` 在首次运行时按默认值生成；当文件版本低于当前二进制支持的版本时，会按链式规则逐版迁移。

- `site`：对外展示的服务名称与版本
- `server`：监听端口与 CORS 来源
- `database`：MySQL 连接
- `redis`：Redis 连接与键前缀
- `smtp`：邮箱验证所需的邮件发送配置
- `security`：验证码、密码成本、限流
- `oauth2`：发行者、客户端、令牌有效期
- `yggdrasil`：元信息、签名密钥、纹理上限、功能开关

逐字段说明见 [配置与接口](/projects/hrpauth/configuration)。

## 与其它项目的关系

- **依赖** [HA-Contract](/projects/ha-contract/)，业务接口以它为唯一事实源
- **提供** `/services/*` 扩展层，供 [HASkinProxy](/projects/haskinproxy/)、[HA 服务部署器](/projects/ha-services-deployer/)、[HA WebUI SDK 处理器](/projects/ha-webui-sdkhandler/) 接入
- **共享** MySQL 数据库给 [HASkinLib](/projects/haskinlib/)，表结构变更需要双方协调
- **被消费于** [HRPAuth Web](/projects/hrpauth-web/) 和 [HRPAuth Spigot](/projects/hrpauth-spigot/)

## 相关页面

- [架构说明](/projects/hrpauth/architecture)：一个请求在服务内部如何流转
- [配置与接口](/projects/hrpauth/configuration)：完整的配置参考与路由分组
- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/)：独立部署的 Yggdrasil 版本
