# Architecture

WinnerProxy 只为 Minecraft 服务端回答一个问题：谁进来了，用的是哪个 UUID。进程里的其它一切，都是为了让这个答案最终来自 HRPAuth，即便玩家用的是 Mojang 账号。

## 上游抽象层

### 接口

`internal/proxy` 定义了 `UpstreamService`，这是上游必须满足的最小契约。

```text
HasJoined(params url.Values) (*hrpauth.PlayerProfile, error)
QueryProfile(uuid string, unsigned bool) (*hrpauth.PlayerProfile, error)
BatchQuery(names []string) ([]*hrpauth.PlayerProfile, error)
ID() string
```

### 两个实现

- `HrpauthService` 包装 HRPAuth 客户端，`ID()` 为 `hrpauth`
- `MojangService` 访问 `api.minecraftservices.com`，`ID()` 为 `mojang`，只在 `upstreams.official.enabled` 为 `true` 时才会被创建

handler 通过 `ID()` 查找上游，因此接入第三个提供方只需要实现这个接口并把它加进服务列表，其它代码不用动。

## hasJoined 流程

`hasJoined` 是唯一有真实逻辑的路由，它分三个阶段推进。

```text
GET /sessionserver/session/minecraft/hasJoined
  -> 阶段一  HRPAuth hasJoined
       200 -> 返回 HRPAuth 资料，流程结束
  -> 阶段二  Mojang hasJoined
       200 -> 记下 Mojang UUID 与 Mojang 皮肤
  -> 阶段三  在 HRPAuth 上 POST /register
       200 -> 返回 HRPAuth 的 profile_id，皮肤仍然是 Mojang 的
```

### 阶段一：HRPAuth

查询参数原样透传给 HRPAuth，因此上游后续可能新增的参数，例如 `ip`，不需要改 WinnerProxy。

返回 `200` 且带有真实资料时流程结束。该资料同时按 UUID 写入缓存，为后续的资料查询预热。

### 阶段二：Mojang

HRPAuth 没有记录时，同样的参数会发往官方 Mojang sessionserver。

返回 `200` 时你拿到 Mojang UUID 和 Mojang 皮肤。查询结果按玩家名写入缓存，因此 TTL 内的重复加入不再走 Mojang。

### 阶段三：代理注册

代理按需创建 HRPAuth 侧的账号。

- 玩家名与 Mojang UUID 随一个随机密码一起发给 HRPAuth 的 `POST /register`，这个密码玩家永远看不到
- 成功后响应里带回 HRPAuth 的 `profile_id`，它就是返回给游戏端的身份
- 皮肤仍来自 Mojang，玩家保留官方外观

### 失败模式

- 所有上游都回答 `204`：代理回答 `204 No Content`
- HRPAuth 回答 `5xx` 或网络失败：记录一条 WARN 日志，流程从阶段二继续
- Mojang 回答 `5xx` 或网络失败：代理回答 `204 No Content`
- 注册返回 `409` 且错误码为 `username_already_bound`：记录一条 WARN 日志并回答 `204 No Content`，因为该用户名已绑定在一个不可绑定的账号上
- 注册以其它原因失败：代理回答 `503`，响应体为 `{"error": "auth backend unavailable"}`

这里的 `204` 表示"这次加入不被允许"，正是 Yggdrasil 客户端预期的语义。

## 身份模型

### 一个人的一个 UUID

Minecraft 服务端看到的永远是 HRPAuth 的 `profiles.id`。Mojang UUID 不会离开代理，只有注册请求里会带上它。

因此同一个玩家无论走哪条登录路径，显示的都是同一个 UUID。游戏端无法分辨这个答案出自哪条路径。

### 皮肤透传

皮肤取自作出应答的那一侧。

- 阶段一返回 HRPAuth 存储的皮肤
- 阶段三返回 Mojang 签名过的皮肤

这个差异是有意为之：HRPAuth 账号显示 HA 里存的皮肤，Mojang 账号显示它的官方皮肤。

### Mojang 关联字段

`users.mojang_uuid` 存在于 HRPAuth 内部，不在代理里。它解决两个问题：哪个 Mojang 玩家等同于哪个 HRPAuth 玩家，以及某个玩家名是否已被绑定。WinnerProxy 只负责提供这个值，也就是注册请求里的 `mojang_uuid` 字段。

## 缓存层

`internal/cache` 提供 `ProfileCache` 接口，有两个实现：基于 freecache 的实现和 noop 实现。

### 两个 keyspace

- `ha:profile:<uuid>` 存放 HRPAuth 资料
- `mojang:hasjoined:<name>` 存放 Mojang 资料

两者存在同一个存储里，但键集合互不重叠。默认 TTL 是 300 秒。

### 负结果不缓存

`204` 应答和上游错误都不会写进缓存。这样新注册的账号下一次加入就能被识别，不必等一条陈旧的负记录过期。

### 关闭缓存

`cache.size = 0` 会选中 noop 实现，此后每次查询都会直接打到上游。

## Presence 与 relay 规则

启动时，代理通过微服务扩展层把自己注册进 HRPAuth。握手在后台进行，不会阻塞监听。

### relay 规则表

代理注册十一条 relay 规则，全部挂在 `/winnerproxy` 前缀下。

```text
/                       /authserver                /sessionserver
/api/profiles/minecraft /textures                  /previews
/texture                /skin                      /skins
/minecraftservices      /register
```

目标是 `<前缀><路径>`，来源是 `<server.public_url><路径>`。当 `server.public_url` 为空时，relay 注册会被跳过。

### presence 载荷

- `security_level: 0`，允许 Yggdrasil 流量匿名走 relay
- `frontend_areas: ["webui-dash"]`，让服务出现在 WebUI 面板里
- HRPAuth 的根元信息，便于 HRPAuth 汇总代理的 Yggdrasil 信息

## 路由

| 路由 | 用途 |
|---|---|
| `GET /health` | 存活探针，返回 `{"status": "ok"}` |
| `GET /` | Yggdrasil 根元信息，从 HRPAuth 透传 |
| `GET /winnerproxy` | 带前缀的同一份根元信息 |
| `GET /sessionserver/session/minecraft/hasJoined` | 三阶段的加入查询 |
| `GET /sessionserver/session/minecraft/profile/:uuid` | 按 UUID 查询资料 |
| `POST /api/profiles/minecraft` | 按名字批量查询 |

Yggdrasil 这一组路由会绑定两次，分别在 `/` 和 `/winnerproxy` 下。启动器与旧式探针使用无前缀形式，HA 自己的客户端使用带前缀的形式。

## 明确不做的事

- 不保存玩家数据。没有数据库，也没有 Redis，所有身份信息都在 HRPAuth 里
- 不实现 Minecraft 登录相关接口。`/authserver` 是 relay 到 HRPAuth，不在这里提供服务
- 不改写皮肤。上游给什么就透传什么
- 不缓存失败，也不做长时间缓存
- HRPAuth 不可用时不阻塞启动。监听无论如何都会起来，失败以单次请求的形式出现
- 不把 Mojang UUID 暴露给游戏端

## 相关页面

- [概览](/zh/projects/winnerproxy/)
- [配置](/zh/projects/winnerproxy/configuration)
- [HRPAuth 架构说明](/zh/projects/hrpauth/architecture)
