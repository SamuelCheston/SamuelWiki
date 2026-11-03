# 配置与接口

服务只读取项目根目录下的一个 `config.yaml`。带注释的完整示例见[配置文件使用指南](/zh/guide/how-to-use-conf-file)，本页说明这个文件如何被处理，以及每个配置块负责什么。

## 配置生命周期

启动时按以下顺序处理配置文件。

1. 检查 `config.yaml` 是否存在
2. 不存在则写入默认配置
3. 存在则读取 `version` 字段
4. 版本低于当前二进制支持范围时，执行链式迁移
5. 版本高于当前二进制支持范围时，仅告警，绝不重写文件

## 顶层结构

- `version`
- `site`
- `server`
- `security`
- `callback`
- `frontend`
- `keygen`
- `database`
- `verification_code`
- `redis`
- `smtp`
- `manage`
- `yggdrasil`

## 关键配置块

### `site`

对外展示的名称与实现版本。`GET /status` 会返回它，Yggdrasil 元信息里也会带上它。

### `server`

- `port`：监听地址，生成的默认值是 `:2778`
- `cors_origin`：允许的 CORS 来源

### `database`

MySQL 连接配置。数据库连通性是启动成功的硬前提，因为迁移会在连接建立后立刻执行。

### `redis`

用于图形验证码、邮箱验证码和登录限流计数。多个部署共用同一个 Redis 实例时，务必保持 `prefix` 隔离。

### `smtp`

邮箱验证依赖它。尽早把这个配置块补齐，否则后期联调失败很容易被误判成接口层的问题。

### `manage`

`oauth2` 是站内业务鉴权的新主入口。

- `oauth2.super_client_id`
- `oauth2.super_client_secret`
- `oauth2.public_client_id`
- `oauth2.public_redirect_uris`
- `oauth2.super_client_extra_scopes`

`manage.token` 仍然保留，但已经是兼容迁移字段，不再是新接口的主凭据。

### `security`

站内业务层的安全配置。验证码开关、密码成本和限流都放在这里。

### `yggdrasil.server`

控制 Minecraft 生态看到的东西。

- `name`、`implementation`、`version`
- `signature_public_key_path`、`signature_private_key_path`
- `textures_storage`
- `links.homepage`、`links.register`
- `skin_domains`

`links` 为空时，元信息会回退到由 `frontend.url` 推导出的值。

### `yggdrasil.security`

- `token_expiry_days`
- `session_expiry_seconds`
- `max_texture_width`、`max_texture_height`：像素尺寸上限，超出时以 notice 形式返回而不是直接拒绝
- `max_texture_file_size`：字节大小上限，超出时拒绝上传
- `max_tokens_per_user`：单个用户最多持有的有效 `accessToken` 数量

### `yggdrasil.feature_flags`

协议兼容开关，见下面的[功能开关](#功能开关)。

## 令牌类型

| 名称 | 字段 | 作用范围 | 颁发接口 |
|---|---|---|---|
| OAuth2 access token | `access_token` | 业务路由 | `/oauth/token`、`/totp/verify` |
| OAuth2 refresh token | `refresh_token` | 令牌续期 | `/oauth/token` |
| Login ticket | `login_ticket` | TOTP 二步验证临时凭据 | `/oauth/login-ticket` |
| Yggdrasil access token | `accessToken` | Minecraft 客户端会话 | `/authserver/authenticate` |
| Yggdrasil client token | `clientToken` | 与 access token 配对 | `/authserver/authenticate` |

## 功能开关

| 开关 | 作用 |
|---|---|
| `non_email_login` | 允许用角色名而非邮箱走 Yggdrasil 登录 |
| `legacy_skin_api` | 保留旧的 `GET /skins/MinecraftSkins/{username}.png` 路由 |
| `no_mojang_namespace` | 去掉资料属性里的 Mojang 命名空间 |
| `enable_mojang_anti_features` | 暴露 Mojang 反作弊相关元信息 |
| `enable_profile_key` | 启用 Minecraft 1.19+ 聊天签名密钥 |
| `username_check` | 校验 Minecraft 角色名格式 |
| `enable_ip_check` | 校验 `hasJoined` 中的 IP 与会话记录是否一致 |

这些开关位于 `yggdrasil.feature_flags` 下，只影响协议层，不影响站内业务层。

## 路由分组

### 业务路由

`/oauth/*`、`/register`、`/login`、`/logout`、`/forgot-password`、`/reset-password`、`/user`、`/change-username`、`/user/security/*`、`/webauthn/*`、`/email-verification`、`/email-2fa/*`、`/totp/*`、`/captcha/*`、`/texture/*`、`/internal/*`。

### Yggdrasil 路由

`/authserver/*`、`/sessionserver/*`、`/api/profiles/minecraft`、`/api/user/profile/:uuid/:textureType`、`/textures/:hash`、`/skins/MinecraftSkins/:username`、`/minecraftservices/*`。

### 扩展路由

`/services/presence`、`/services/list`、`/services/sdk/:name`、`/services/relay`、`/services/sdk-packages`。

## 容易误解的点

- `keygen.enable` 为 `1` 时会拒绝密钥生成路由。读它的时候要当作禁用开关，而不是启用开关。
- `callback.url` 是后端地址，`frontend.url` 是前端站点地址。元信息的回退逻辑用的是后者。
- 验证码配置属于顶层 `security` 块，不在 `yggdrasil.security` 里。
- 站内 OAuth2 access token 与 Yggdrasil `accessToken` 毫无关系。混用会得到一堆看起来合理、实际毫无帮助的报错。

## 联调检查

全新启动后，先检查这两个接口。

- `GET /status`
- `GET /`

两个都有响应，说明站内业务层和 Yggdrasil 元信息至少已经能对外工作。

## 相关页面

- [概览](/zh/projects/hrpauth/)
- [架构说明](/zh/projects/hrpauth/architecture)
- [API 规范](/zh/projects/ha-contract/api-standards)：所有业务路由必须遵守的契约
