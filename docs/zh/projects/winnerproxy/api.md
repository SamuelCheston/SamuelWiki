# 接口参考

WinnerProxy 暴露五个 HTTP 端点：一个健康探针、一个绑定两次的根元信息路由、三个 Yggdrasil 路由。行为均已对照当前代码与 HA-Contract 的 WinnerProxy 开发契约核实。

## 约定

- Base URL：`http://<server.addr>`，默认 `http://127.0.0.1:2777`
- Yggdrasil 路由绑定两次：无前缀（启动器与旧式探针）与 `/winnerproxy` 前缀下（HA 自己的客户端）
- 除特别说明外，请求与响应均为 `application/json`
- 错误响应体为 `{"error": "..."}`，配 4xx/5xx 状态码

## `GET /health`

存活探针，不访问任何上游。

```json
{ "status": "ok" }
```

## `GET /` 与 `GET /winnerproxy`

Yggdrasil 根元信息，从 HRPAuth（管理面根地址的 `GET /`）透传，客户端因此能看到 HA 真实的 `skinDomains` 与 `signaturePublickey`。HRPAuth 不可达时回退为：

```json
{ "skinDomains": [] }
```

## `GET /sessionserver/session/minecraft/hasJoined`

Minecraft 服务端调用的会话检查，是带三阶段逻辑的主端点，见[数据流转](/zh/projects/winnerproxy/data-flow)。

查询参数（Yggdrasil 标准）：

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `username` | string | 是 | 进服玩家的 Minecraft 用户名 |
| `serverId` | string | 是 | serverId 密钥与玩家会话共享密钥之和的 SHA-1 十六进制 |
| `ip` | string | 否 | 进服玩家 IP；原样透传，上游的 IP 检查无需改代理 |

响应：

- `200`：`PlayerProfile` 对象（见下文）
- `204`：没有任何上游确认该会话，游戏端拒绝加入
- `503`：代理注册阶段失败——当前的上游漂移对每个 Mojang 玩家产生的正是该结果（见[架构说明](/zh/projects/winnerproxy/architecture#已知的上游漂移)）

缓存行为：

- 阶段一命中时，资料写入 `ha:profile:<uuid>`
- 阶段二命中时，Mojang 资料写入 `mojang:hasjoined:<name>`，TTL 内的重复加入跳过 Mojang
- 默认 TTL 300 秒（`cache.ttl_sec`）；否定结果一律不缓存

## `GET /sessionserver/session/minecraft/profile/:uuid`

按 UUID 查询资料。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `uuid`（路径） | string | — | 32 位资料 UUID |
| `unsigned`（查询） | bool | `true` | `true` 丢弃纹理签名；`false` 保留 |

响应：

- `200`：`PlayerProfile` 对象
- `404`：上游查询失败

先查 HA 资料缓存；未命中时转发上游并预热缓存。

## `POST /api/profiles/minecraft`

按用户名批量查询。只查 HRPAuth 上游——不走 Mojang 回退，也不做代理注册。

请求体：纯用户名数组。

```json
["alice", "bob", "charlie"]
```

响应 `200`：纯 `{id, name}` 摘要数组；按 Yggdrasil 惯例丢弃纹理属性，上游不存在的用户名被静默忽略。

```json
[
  { "id": "a1b2c3d4e5f6...", "name": "alice" },
  { "id": "f6e5d4c3b2a1...", "name": "bob" }
]
```

响应：请求体畸形为 `400`，上游调用失败为 `500`。当前的上游漂移（多出的 `/yggdrasil` 路径段，见[架构说明](/zh/projects/winnerproxy/architecture#已知的上游漂移)）使该路由在当前上游下回答 `500`。批量结果不缓存。

## 响应体格式

`PlayerProfile` 是 Yggdrasil 标准资料对象：

```json
{
  "id": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "name": "Alice",
  "properties": [
    {
      "name": "textures",
      "value": "eyJ0aW1lc3RhbXAi...",
      "signature": "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE..."
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | HRPAuth 侧资料 ID——永远是平台身份，不是 Mojang UUID |
| `name` | string | 玩家名 |
| `properties` | array | 纹理属性，可能为空 |

`hasJoined` 走 Mojang 路径时，`properties` 是 Mojang 签名的纹理，而 `id` 与 `name` 仍是 HRPAuth 侧身份。

## 相关页面

- [数据流转](/zh/projects/winnerproxy/data-flow)：`hasJoined` 的逐阶段逻辑
- [架构说明](/zh/projects/winnerproxy/architecture)：组件、身份模型与已知漂移
- [配置](/zh/projects/winnerproxy/configuration)：全部配置键
