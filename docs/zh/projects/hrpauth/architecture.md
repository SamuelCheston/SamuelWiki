# Architecture

HRPAuth 是系统的业务核心。自 2026-10 服务拆分后，业务接口与微服务扩展层由核心自己提供，Yggdrasil 协议面则位于 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 服务，核心把 `/yggdrasil-api` 前缀中继给它。

## 请求分层

### 业务接口

Web UI 和第三方客户端使用的部分，鉴权走 OAuth2 Bearer Token。

- `/oauth/*`：授权、登录票据、签发令牌、刷新、撤销
- `/register`、`/logout`、`/forgot-password`、`/reset-password`
- `/user`、`/user/lookup`、`/user/deleted`、`/change-username`、`/user/security/*`
- `/webauthn/*`：通行密钥注册与登录
- `/email-verification`、`/email-2fa/*`、`/totp/*`、`/captcha/*`
- `/internal/*`：供卫星服务调用的凭据校验、令牌校验与账号认领

登录是一次 OAuth2 授权码流程（第一方 WebUI 使用 PKCE）。

### Yggdrasil 接口

Minecraft 客户端访问的部分——`accessToken` 加 `clientToken`、`/authserver/*`、`/sessionserver/*`、`/api/profiles/minecraft`、纹理路由与 `/minecraftservices/*`。拆分后这些路由由 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 服务提供，核心只负责把 `/yggdrasil-api` 前缀中继过去。路由细节见该项目的页面。

### 微服务扩展层

卫星服务接入 Web UI 的方式。主服务自身的流程严格遵循外部标准，不可扩展；只有它的前流程和后流程可以扩展。

- `POST /services/presence`：注册心跳，声明作用区域、SDK 地址与鉴权级别
- `POST /services/auth-key`：签发服务间 `X-Internal-Key` 鉴权使用的临时内部密钥
- `POST /services/route` 与 `POST /services/hook`：注册扩展路由与钩子
- `POST /services/relay`：声明 relay 规则，把前端可访问的路径转发出去；`GET /services/relay` 列出规则
- `/services/sdk-packages`：编译期 SDK 包的上传、列表、获取、下载与删除

## 两条主链路

```text
浏览器 / WebUI
  -> JSON 或表单请求
  -> Auth / User / TOTP / Captcha Controller
  -> Service
  -> MySQL / Redis
```

```text
Minecraft 客户端 / authlib-injector
  -> 核心 relay（/yggdrasil-api 前缀）
  -> HRPAuth Yggdrasil API 服务
  -> 其自有的 MySQL / 文件存储
```

## 两套令牌

这是理解这个平台最重要的一点。

### 业务令牌

- 存放在 `oauth2_access_tokens` 和 `oauth2_refresh_tokens`
- 第一方登录通过 `login_ticket` 加 `TOTP` 完成二步验证
- 所有业务路由使用它

### Yggdrasil 令牌

- `accessToken` 与 `clientToken`
- 状态记录在 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 服务的 `tokens` 表
- 三种状态：`valid`、`temporarily_invalid`、`invalid`

两套体系完全隔离。业务 access token 无法调用 Yggdrasil 路由，Yggdrasil token 也无法调用业务路由。

## 后台任务

核心启动两个周期清理任务：已删除账号清理（每 5 天）与 OAuth2 令牌清理（每 24 小时）。Yggdrasil 侧的清扫（会话令牌、代注册账号、mbe 超时）在 HRPAuth Yggdrasil API 服务里运行。

## 账号注销与恢复

- `DELETE /user`（请求体带密码，要求 `user.delete` scope）执行软删除：置 `users.deleted_at`，并把 UID 记入 `deleted_accounts`。该账号的令牌会被撤销，立即下线。
- 在物理清理发生前，用户用正确凭据再次登录时，登录会自动清除删除标记并移除 `deleted_accounts` 记录——账号随之恢复。
- 已删除账号清理任务会级联物理删除标记超过 3 天的账号。任务周期为 5 天，因此实际冷静期在 3 到 8 天之间。

## 启动行为

服务倾向于把"能自动做的初始化"放到启动流程里。

- `config.yaml` 不存在时自动生成
- 配置版本较旧时自动迁移到当前版本
- 数据库连接建立后执行尚未应用的数据库迁移
- 确保内置 OAuth2 客户端（内部 super 客户端与第一方 WebUI 客户端）存在

这让首次部署很直接，但也意味着你必须认真阅读启动日志。

## 纹理存储

纹理的上传与分发属于 Yggdrasil 协议面，拆分后位于 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 服务，存储细节见该项目的页面。

## 相关页面

- [概览](/zh/projects/hrpauth/)
- [配置与接口](/zh/projects/hrpauth/configuration)
- [令牌体系](/zh/projects/hrpauth/configuration#令牌类型)
