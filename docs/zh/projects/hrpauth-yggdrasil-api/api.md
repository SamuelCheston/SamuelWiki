# 接口参考

服务对外暴露三族接口：游戏客户端使用的 Yggdrasil 协议面、WebUI SDK 调用的业务接口，以及只有核心才能访问的内部接口。本页逐条列出路由、报文与对应的错误格式。

## 元信息

`GET /` 同时返回 Yggdrasil 元信息与服务状态。

```http
GET / HTTP/1.1
```

```json
{
  "status": "online",
  "success": true,
  "message": "HRPAuth Yggdrasil API Provider is running.",
  "site": {
    "name": "HRPAuth",
    "url": "https://auth.example.com",
    "version": "1.0.0",
    "server_time": "2026-01-01 12:00:00"
  },
  "yggdrasil": {
    "meta": {
      "serverName": "HRPAuth",
      "implementationName": "HRPAuth Yggdrasil API Provider",
      "implementationVersion": "1.0.0",
      "links": {
        "homepage": "https://auth.example.com",
        "register": "https://auth.example.com/register"
      },
      "feature.non_email_login": true,
      "feature.legacy_skin_api": true,
      "feature.no_mojang_namespace": false,
      "feature.enable_mojang_anti_features": false,
      "feature.enable_profile_key": false,
      "feature.username_check": true
    },
    "skinDomains": ["auth.example.com", ".auth.example.com"],
    "signaturePublickey": "-----BEGIN PUBLIC KEY-----\n..."
  }
}
```

响应还会带上 `X-Authlib-Injector-API-Location: /` 头。

- `site.url` 来自启动时从核心读取的站点元信息
- 核心提供了前端地址时，`links.homepage` 与 `links.register` 会被替换成它
- `yggdrasil.server.skin_domains` 为空时，`skinDomains` 回退为站点域名，同时给出带点与不带点两种形式
- `signaturePublickey` 是 `yggdrasil.server.signature_public_key_path` 指向的文件内容

## 认证

`POST /authserver/authenticate` 用凭据换取 access token。

```http
POST /authserver/authenticate HTTP/1.1
Content-Type: application/json

{
  "username": "Player",
  "password": "...",
  "clientToken": "...",
  "requestUser": true
}
```

```json
{
  "accessToken": "...",
  "clientToken": "...",
  "availableProfiles": [
    {"id": "0123456789abcdef0123456789abcdef", "name": "Player", "model": "default"}
  ],
  "selectedProfile": {"id": "0123456789abcdef0123456789abcdef", "name": "Player", "model": "default"},
  "user": {
    "id": "...",
    "email": "player@example.com",
    "username": "Player",
    "properties": []
  }
}
```

- 请求未带 `clientToken` 时由服务生成
- `user` 只在 `requestUser` 为 `true` 时出现
- 标识符可以是邮箱，也可以是角色名，取决于 `yggdrasil.feature_flags.non_email_login`
- 命中限流的登录会被拒绝，消息为 `Too many login attempts. Please try again later.`

同组另外四个路由：

- `POST /authserver/refresh` 接受 `accessToken`、`clientToken`、可选的 `selectedProfile` 与 `requestUser`，返回新的 `accessToken`、同一个 `clientToken` 与选中的档案。
- `POST /authserver/validate` 接受 `accessToken` 与 `clientToken`。令牌有效返回 `204`，否则返回 `403`。
- `POST /authserver/invalidate` 接受 `accessToken` 与 `clientToken`，一律返回 `204`。
- `POST /authserver/signout` 接受 `username` 与 `password`，作废该账号的全部令牌并返回 `204`。

## 会话

`POST /sessionserver/session/minecraft/join` 为游戏服务器开启会话。

```http
POST /sessionserver/session/minecraft/join HTTP/1.1
Content-Type: application/json

{
  "accessToken": "...",
  "selectedProfile": "0123456789abcdef0123456789abcdef",
  "serverId": "..."
}
```

会话按档案与服务器存储，同时记录客户端 IP。响应为 `204`。

`GET /sessionserver/session/minecraft/hasJoined` 是反向查询，小写拼写 `/hasjoined` 同样有效。

```http
GET /sessionserver/session/minecraft/hasJoined?username=Player&serverId=...&ip=... HTTP/1.1
```

```json
{
  "id": "0123456789abcdef0123456789abcdef",
  "name": "Player",
  "properties": [
    {"name": "textures", "value": "...", "signature": "..."}
  ]
}
```

- 缺少 `username` 或 `serverId` 返回 `400`
- 档案不存在、会话不存在或 IP 不匹配时返回 `204`
- `enable_ip_check` 关闭时，`ip` 参数被忽略

`GET /sessionserver/session/minecraft/profile/:uuid` 按 UUID 返回单个档案。

```http
GET /sessionserver/session/minecraft/profile/0123456789abcdef0123456789abcdef?unsigned=false HTTP/1.1
```

- `unsigned` 默认为 `true`，此时每个属性上的 `signature` 字段都会被去掉
- UUID 不存在时返回 `404`，错误类型为 `ProfileNotFoundException`

## 档案查询

`POST /api/profiles/minecraft` 一次解析多个角色名。请求体是纯字符串数组，响应也是纯数组。

```http
POST /api/profiles/minecraft HTTP/1.1
Content-Type: application/json

["Player", "SomeoneElse"]
```

```json
[
  {"id": "0123456789abcdef0123456789abcdef", "name": "Player"}
]
```

只有存在的名字会出现在结果里。请求体不是字符串数组时返回 `400`，错误类型为 `IllegalArgumentException`。

## 纹理

### 下载

`GET /textures/:hash` 返回原始 PNG 文件。

```http
GET /textures/1a2b3c4d5e6f... HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: image/png
```

哈希未知时返回 `404`，错误码为 `target_not_found`。

`GET /previews/:fileName` 返回预览图。预览图是 WebP，文件名带类型，例如 `1a2b3c..._skin.webp`。

`GET /texture/avatar/:uuid` 返回从皮肤裁出的头部 PNG。档案没有皮肤时返回 `404`。

### 列表

`POST /texture/get` 列出令牌所拥有的全部档案的纹理。

```http
POST /texture/get HTTP/1.1
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "Success",
  "data": {
    "profiles": [
      {
        "id": "0123456789abcdef0123456789abcdef",
        "name": "Player",
        "model": "default",
        "textures": {
          "skin": {"url": "https://auth.example.com/yggdrasil-api/textures/1a2b3c...", "hash": "1a2b3c..."}
        }
      }
    ]
  }
}
```

`profiles` 数组同时出现在响应的顶层。

### 上传

`POST /texture/upload/:uuid` 接收 multipart 表单。

```http
POST /texture/upload/0123456789abcdef0123456789abcdef HTTP/1.1
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

file=@skin.png&type=skin&model=default
```

- `file` 是图片，必填
- `type` 取 `skin` 或 `cape`，默认 `skin`
- `model` 取 `default` 或 `slim`，默认 `default`
- 响应带 `warnings` 数组，图片比例符合标准时它为空

### 删除

`DELETE /texture/delete/:uuid/:type` 从档案上移除某一种纹理。

```http
DELETE /texture/delete/0123456789abcdef0123456789abcdef/skin HTTP/1.1
Authorization: Bearer <accessToken>
```

档案必须属于令牌对应的账号，否则返回 `403`，错误码为 `profile_access_denied`。

### 旧版皮肤

`GET /skin/:username` 与 `GET /skins/MinecraftSkins/:username` 以图片形式返回角色皮肤。`yggdrasil.feature_flags.legacy_skin_api` 关闭时两者都返回 `404`；角色没有皮肤时返回 `204`。

## 聊天签名

`POST /minecraftservices/player/certificates` 签发聊天签名用的档案密钥对。

```http
POST /minecraftservices/player/certificates HTTP/1.1
Authorization: Bearer <accessToken>
```

```json
{
  "keyPair": {"privateKey": "...", "publicKey": "..."},
  "publicKeySignature": "...",
  "publicKeySignatureV2": "...",
  "expiresAt": "2026-01-03T00:00:00Z",
  "refreshedAfter": "2026-01-02T16:00:00Z"
}
```

- `yggdrasil.feature_flags.enable_profile_key` 关闭时该路由返回 `403`
- 令牌缺失或无效时返回 `401`

`GET /minecraftservices/publickeys` 分三组返回服务端公钥：`playerCertificateKeys`、`profilePropertyKeys`、`authenticationKeys`。

## 业务接口

这批接口接受 Bearer Token。`GET /player` 与两个 Mojang 绑定路由既接受核心 OAuth2 access token，也接受 Yggdrasil access token。档案相关路由会向核心校验令牌，因此需要核心 OAuth2 access token。

`GET /player` 返回账号摘要。

```http
GET /player HTTP/1.1
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "ok",
  "data": {
    "uid": "...",
    "account_id": 1,
    "mbe": false,
    "mojang_uuid": "",
    "cbh": true
  }
}
```

`GET /player/profile` 返回调用者的游戏档案，尚未创建时 `profile` 为空。

`POST /player/profile` 创建游戏档案。请求体带 `mode`，并按模式附带 `uuid` 或 `username`。

```http
POST /player/profile HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "mode": "mojang",
  "username": "PremiumName"
}
```

- `random` 生成一个 UUID
- `custom` 使用传入的 `uuid`
- `mojang` 按正版用户名查得 UUID
- 重复调用返回 `409`，错误码为 `profile_already_exists`

`POST /player/mojang-bind-enable` 与 `POST /player/mojang-bind-disable` 开关 Mojang 绑定流程。开启后会挂一个 15 分钟倒计时，绑定未完成时标记会被自动清掉。

两个路由代理 Mojang sessionserver：

- `GET /mojang/profile/:uuid` 返回 `id`、`name` 与 `has_cape`
- `GET /texture/mojang/:uuid?type=skin` 返回 `302` 跳转到 `textures.minecraft.net`；`type` 接受 `skin` 与 `cape`

## 内部接口

这两个路由要求在 `X-Internal-Key` 头里带上内部密钥，缺失时返回 `401`。

`GET /internal/heartbeat` 返回 `I am alive`。

`POST /internal/proxy-register` 创建一个没有核心用户托底的游戏账号。请求体带 `username`、`password` 与 `mojang_uuid`。

```http
POST /internal/proxy-register HTTP/1.1
X-Internal-Key: ...
Content-Type: application/json

{
  "username": "ProxyUser",
  "password": "...",
  "mojang_uuid": "0123456789abcdef0123456789abcdef"
}
```

```json
{
  "success": true,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "Proxy account registered",
  "data": {"account_id": 2, "profile_id": "fedcba9876543210fedcba9876543210"},
  "account_id": 2,
  "profile_id": "fedcba9876543210fedcba9876543210"
}
```

用同一个 `mojang_uuid` 再次登记会返回已有账号，而不是新建一个。当用户名与一个开着 Mojang 绑定窗口（`mbe=1`）的账号撞名时，请求会改为完成该绑定流程：写入 `mojang_uuid`、重置 `mbe`，并保留已有账号的身份。

`POST /register` 是这条路由的业务对应版本。它接受 `identifier`、`password` 与可选的 `mojang_uuid`，先向核心校验凭据，再在一个事务里创建账号与默认档案。

## 管理端点

两条路由作用于代理注册的账号。两者都要求带专用 scope 的 OAuth2 服务令牌 Bearer，且都由 [HRPAuth Spigot](/zh/projects/hrpauth-spigot/) 插件经核心的 `/yggdrasil-api` relay 调用。

`POST /admin/claim-user` 为玩家认领一个代理注册的游戏账号（`cbh=0`）。请求体带游戏档案名 `username`、`email` 与 `password`；服务通过核心的 `POST /internal/claim-user` 创建核心用户，把它关联到游戏账号，并置 `cbh=1`。要求 `user.claim.as-service` scope。特征错误码：`user_not_found`（404）、`user_not_claimable` / `email_already_registered` / `username_already_bound`（409）。

`POST /admin/force-bind` 把 `mojang_uuid` 从代理注册账号（按档案名匹配）转移到由目标 `email` + `password` 标识的账号（向核心校验凭据），然后删除代理账号。要求 `user.force-bind.as-service` scope。特征错误码：`no_mojang_uuid`（400）、`invalid_credentials`（403）、`user_not_found`（404）、`mojang_uuid_already_bound`（409）。

## 错误响应

服务有三种错误格式。

协议接口使用 Yggdrasil 格式。

```json
{
  "error": "ForbiddenOperationException",
  "errorMessage": "Invalid credentials.",
  "cause": null
}
```

业务接口使用统一的响应外壳。

```json
{
  "success": false,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "invalid or missing bearer token",
  "code": "invalid_credentials",
  "error": "invalid_credentials"
}
```

`code` 是机器可读的标识，`error` 是它的同值副本，兼容按该字段读取的调用方。业务接口成功时，`data` 里的键还会被复制到文档顶层。

未知路由返回 `404`，使用协议格式。

```json
{
  "error": "Not Found",
  "errorMessage": "The requested endpoint does not exist.",
  "cause": null
}
```

聊天签名相关路由在令牌缺失或无效时使用自己的格式。

```json
{
  "path": "/minecraftservices/player/certificates",
  "errorType": "Unauthorized",
  "error": "Unauthorized",
  "errorMessage": "Unauthorized"
}
```

所有响应都带 `X-Request-Id` 头，相同的值也会出现在 `meta.request_id` 中。

## 相关页面

- [概览](/zh/projects/hrpauth-yggdrasil-api/)
- [架构说明](/zh/projects/hrpauth-yggdrasil-api/architecture)
- [API 规范](/zh/projects/ha-contract/api-standards)：业务接口必须遵守的契约
