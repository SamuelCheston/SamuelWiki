# 数据流转

本页逐分支说明 Minecraft 服务端调用 WinnerProxy 的 `hasJoined` 时发生的每一件事。所有端点语义均已对照当前代码与 HA-Contract 开发契约核实。

## 总览

```text
Minecraft 服务端（online-mode=true，authlib-injector 指向 WinnerProxy）
  │
  │ GET /sessionserver/session/minecraft/hasJoined?username=X&serverId=Y
  ▼
WinnerProxy（默认监听 :2777）
  │
  ├─► 阶段一：HRPAuth 认证路径
  │     GET {upstreams.hrpauth.url}/sessionserver/session/minecraft/hasJoined?...
  │     ├─ 200 + 资料 → 原样返回给 Minecraft。结束。
  │     ├─ 204 → 进入阶段二。
  │     └─ 5xx / 网络错误 → 记 WARN，进入阶段二。
  │
  ├─► 阶段二：Mojang 认证路径
  │     GET https://sessionserver.mojang.com/session/minecraft/hasJoined?...
  │     ├─ 200 + mojangProfile → 取出 mojangUUID，进入阶段三。
  │     ├─ 204 → 向 Minecraft 返回 204。结束。
  │     └─ 5xx / 网络错误 → 返回 204。结束。
  │
  └─► 阶段三：代理注册
        POST {upstreams.hrpauth.url}/register
        Header: Authorization: Bearer <OAuth2 服务令牌>
        Body: { username, password (随机 22 字符), email: "",
                mojang_uuid }
        │
        ├─ 200 + {profile_id, ...} →
        │     返回给 Minecraft：
        │       id: profile_id
        │       name: <mojangProfile.name>
        │       properties: mojangProfile.properties
        │     结束。
        │
        ├─ 409 (username_already_bound) →
        │     记 WARN，返回 204。结束。
        │
        └─ 其它任何错误 →
              记 ERROR，返回 503 {"error":"auth backend unavailable"}。结束。
```

`upstreams.hrpauth.url` 的默认值是 `http://127.0.0.1:2778/yggdrasil-api/`：请求发往 HRPAuth 核心，由核心中继到 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 服务，relay 会剥掉 `/yggdrasil-api` 前缀。

## 阶段一：HRPAuth 认证路径

HRPAuth 的 `hasJoined` 校验的是玩家通过 `/authserver/authenticate` 建立的会话。如果玩家使用 HRPAuth 密码登录，这一阶段返回 200 与该玩家的 HRPAuth 资料。

Minecraft 服务端看到的响应形如：

- `id`：HRPAuth 资料 ID（玩家在游戏内的稳定 UUID）
- `name`：HRPAuth 用户名
- `properties`：HRPAuth 存储的皮肤属性，用根元信息中发布的 Yggdrasil 密钥签名

这是"HRPAuth 皮肤"路径：客户端用根元信息里的 `signaturePublickey` 校验纹理签名，而根元信息由 WinnerProxy 从 HRPAuth 透传（`GET /` 与 `GET /winnerproxy`）。

## 阶段二：Mojang 认证路径

阶段一返回 204 说明玩家没有使用 HRPAuth 会话，可能用的是 Mojang/Microsoft 会话，于是同样的参数发往 Mojang sessionserver。

200 响应带来 Mojang 原生身份：

- `mojangProfile.id`：玩家的 Mojang UUID
- `mojangProfile.name`：玩家的 Mojang 用户名
- `mojangProfile.properties`：Mojang 签名的皮肤属性

Mojang 的成功应答按玩家名写入缓存（`mojang:hasjoined:<name>`），TTL 内的重复加入不再走 Mojang。

## 阶段三：代理注册

代理请求上游按需创建一个游戏账号：

```json
{
  "username": "Alice",
  "password": "<随机 22 字符>",
  "email": "",
  "mojang_uuid": "f7c77d999f154a66a87dc4a51ef30d19"
}
```

`username` 即 `mojangProfile.name`；`mojang_uuid` 是去掉连字符的 UUID。密码每次请求现场生成（16 字节随机数，base64url 编码），不会展示给任何人。凭据是通过 `client_credentials` 授权获得的 OAuth2 Bearer 令牌。

成功后代理为游戏端组装应答：

```json
{
  "id": "<响应中的 profile_id>",
  "name": "<mojangProfile.name>",
  "properties": "<mojangProfile.properties —— Mojang 签名>"
}
```

`id` 与 `name` 来自 HRPAuth，因此服务端看到的是稳定的 HRPAuth 身份；`properties` 来自 Mojang，玩家保留官方皮肤。原版客户端用 Mojang 内置公钥校验这些属性。

### 当前漂移：阶段三无法成功

上游的 `POST /register`（由 relay 后的 HRPAuth Yggdrasil API 提供）现在绑定 `{identifier (必填), password (必填), mojang_uuid}`。代理仍然发送 `username`，无法满足 `identifier`，上游以 `400` 拒绝请求，代理回答 `503`。在代理切换到契约认可的端点之前，每个 Mojang 玩家都会受影响：

- HRPAuth Yggdrasil API 的 `POST /internal/proxy-register`，请求体 `{username, password, mojang_uuid}`，响应 `data: {account_id, profile_id}`
- 以 `X-Internal-Key` 请求头鉴权；临时密钥来自 HRPAuth 核心的 `POST /services/auth-key`（client-credentials Bearer）

切换尚待密钥生命周期与响应映射的决策；HA-Contract 的 `docs/dev/WinnerProxy/README.md` 记录着同样的状态。

## 失败矩阵

| 阶段 | 上游响应 | WinnerProxy 响应 | 日志级别 |
|---|---|---|---|
| 1 | 200 + 资料 | 200 + HRPAuth 资料 | DEBUG |
| 1 | 204 | （进入阶段二） | DEBUG |
| 1 | 5xx / 网络 | （进入阶段二） | WARN |
| 2 | 200 + mojangProfile | （进入阶段三） | DEBUG |
| 2 | 204 | 204 | INFO |
| 2 | 5xx / 网络 | 204 | WARN |
| 3 | 200 + 注册响应 | 200 + 组装后的资料 | INFO |
| 3 | 409 (username_already_bound) | 204 | WARN（撞名） |
| 3 | 其它任何错误（当前即漂移导致的 400） | 503 | ERROR |

`hasJoined` 返回 `204` 表示"这次加入不被允许"，是 Yggdrasil 客户端预期的语义。

## 示例

### 示例一：HRPAuth 用户 Alice 用 HRPAuth 密码进服

```text
1. Minecraft 服务端调用 hasJoined(username=Alice, serverId=...)
2. WinnerProxy → HRPAuth hasJoined → 200 + {id: <HRPAuth Alice UUID>, name: "Alice", properties: [HRPAuth 皮肤]}
3. WinnerProxy 返回 200 + 该资料。
4. Minecraft 服务端放行，Alice 进服。
```

### 示例二：Mojang 玩家 Bob 进服（当前上游）

```text
1. Minecraft 服务端调用 hasJoined(username=Bob, serverId=...)
2. WinnerProxy → HRPAuth hasJoined → 204（没有 HRPAuth 会话）
3. WinnerProxy → Mojang hasJoined → 200 + {id: <Mojang Bob UUID>, ...}
4. WinnerProxy → 上游 POST /register → 400（请求体发送 username，
   上游要求 identifier）
5. WinnerProxy 返回 503 {"error":"auth backend unavailable"}。
6. Minecraft 服务端拒绝加入。
```

代理切换到 `POST /internal/proxy-register` 之后，第 4 步将成功创建账号，第 5 步返回带新 HRPAuth UUID 与 Mojang 皮肤的组装资料。

### 示例三：撞名

```text
1. 一个 Mojang 玩家试图以 "Alice" 进服，但上游已存在名为 Alice
   且绑定了另一个 Mojang UUID 的账号。
2. 阶段一、二同示例二。
3. 阶段三返回 409 username_already_bound（在注册请求形状修复之后）。
4. WinnerProxy 记录撞名日志并返回 204，该 Mojang 玩家被拒绝。
```

## 注册之后：认领代理账号

代理注册出来的账号没有邮箱，也没有玩家知道的密码。玩家接管它走的是认领流程，而不是 WinnerProxy 的路由：

- 玩家在 Velocity 代理上执行 `/ha reg <email> <password>`，[HRPAuth Spigot](/zh/projects/hrpauth-spigot/) 插件调用 HRPAuth Yggdrasil API 的 `POST /admin/claim-user`
- 运维可以用 `/ha forcebind` 把 Mojang UUID 转移到另一个账号，对应 `POST /admin/force-bind`

历史上的 `POST /user/declare-email` 端点已在整个系统中删除，除上述认领流程外没有继任者。

## 为什么是三个阶段而不是一个？

- **为什么先问 HRPAuth？** 更快（局域网/本机），而且 HRPAuth 玩家是这套设计的顺路径。
- **为什么回退 Mojang？** 这正是意义所在：Mojang 玩家能加入只认 HRPAuth 的服务器。
- **为什么阶段三要代理注册？** 因为 HRPAuth 才是事实源。Minecraft 服务端必须看到 HRPAuth UUID，不能直接返回 Mojang UUID。
- **HRPAuth 返回 200 时为什么不再问 Mojang？** 两个认证同时在途属于边缘情况，按"HRPAuth 优先"处理。Minecraft 服务端一次也只校验一个会话。

## 相关页面

- [架构说明](/zh/projects/winnerproxy/architecture)：这条流程背后的组件
- [故障排查](/zh/projects/winnerproxy/troubleshooting)：日志行的含义
- [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)：承接阶段一与阶段三的上游
