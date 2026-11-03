# Architecture

HRPAuth 在同一个进程里提供两族接口。判断一个路由属于哪一族，是读这份代码最快的方式。

## 请求分层

### 业务接口

Web UI 和第三方客户端使用的部分，鉴权走 OAuth2 Bearer Token。

- `/oauth/*`：授权、签发令牌、刷新、撤销
- `/register`、`/login`、`/logout`、`/forgot-password`、`/reset-password`
- `/user`、`/change-username`、`/user/security/*`
- `/webauthn/*`：通行密钥注册与登录
- `/email-verification`、`/email-2fa/*`、`/totp/*`、`/captcha/*`
- `/texture/*`
- `/internal/*`：供卫星服务调用的凭据与令牌校验

### Yggdrasil 接口

Minecraft 客户端访问的部分，鉴权走 `accessToken` 加 `clientToken`。

- `/authserver/*`：authenticate、refresh、validate、signout
- `/sessionserver/*`：join、hasJoined、profile
- `/api/profiles/minecraft`
- `/textures/:hash`、`/skins/MinecraftSkins/:username`
- `/minecraftservices/*`：聊天签名用的 certificates 与 public keys

### 微服务扩展层

卫星服务接入 Web UI 的方式。主服务自身的流程严格遵循外部标准，不可扩展；只有它的前流程和后流程可以扩展。

- `POST /services/presence`：注册心跳，声明作用区域、SDK 地址与鉴权级别
- `GET /services/list`：发现与自己区域相关的服务
- `GET /services/sdk/:name`：加载服务使用说明
- `POST /services/relay`：声明 relay 规则，把前端可访问的路径转发出去
- `POST /services/sdk-packages`：上传编译期 SDK 包

## 两条主链路

```text
浏览器 / WebUI
  -> JSON 或表单请求
  -> Auth / User / TOTP / Texture / Captcha Controller
  -> Service
  -> MySQL / Redis / 文件存储
```

```text
Minecraft 客户端 / Authlib-Injector
  -> Yggdrasil Controller
  -> AuthService / TextureService
  -> MySQL / 文件存储
```

## 两套令牌

这是理解这个服务最重要的一点。

### 业务令牌

- 存放在 `oauth2_access_tokens` 和 `oauth2_refresh_tokens`
- 第一方登录通过 `login_ticket` 加 `TOTP` 完成二步验证
- 所有业务路由使用它

### Yggdrasil 令牌

- `accessToken` 与 `clientToken`
- 状态记录在 `tokens` 表
- 三种状态：`valid`、`temporarily_invalid`、`invalid`

两套体系完全隔离。业务 access token 无法调用 Yggdrasil 路由，Yggdrasil token 也无法调用业务路由。

## 后台任务

服务启动后会同时启动五个周期任务。

1. Yggdrasil 令牌清理，每 1 小时
2. OAuth2 令牌清理，每 24 小时
3. 代注册用户清理，每 24 小时
4. Session 清理，每 24 小时
5. 纹理清理，每 1 小时

## 启动行为

服务倾向于把"能自动做的初始化"放到启动流程里。

- `config.yaml` 不存在时自动生成
- 配置版本较旧时自动迁移到当前版本
- 准备签名密钥路径
- 执行数据库迁移

这让首次部署很直接，但也意味着你必须认真阅读启动日志。

## 纹理存储

业务路由 `/texture/*` 和 Yggdrasil 纹理路由操作的是同一份底层数据。

- 文件落在 `textures_storage`
- 记录落在 `profile_properties`
- 两者都通过 `/textures/:hash` 对外分发

因此在 Web UI 上传的皮肤，同样会反映到 Yggdrasil 的资料查询结果里。

## 相关页面

- [概览](/zh/projects/hrpauth/)
- [配置与接口](/zh/projects/hrpauth/configuration)
- [令牌体系](/zh/projects/hrpauth/configuration#令牌类型)
