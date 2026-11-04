# 故障排查

常见问题、日志行及其解法。端点行为均已对照当前代码与 HA-Contract 开发契约核实。

## 三条快速检查

```bash
# 1. WinnerProxy 自身（默认端口 2777）
curl http://127.0.0.1:2777/health
# → {"status":"ok"}

# 2. HRPAuth 上游可达（默认核心端口 2778）
curl http://127.0.0.1:2778/
# → Yggdrasil meta JSON

# 3. Mojang 出站可达
curl -sI 'https://sessionserver.mojang.com/session/minecraft/hasJoined?username=Notch'
# → 204/200（204 是正常的，Notch 没有活跃会话）
```

任一条失败，先修底层连通。

## 所有玩家被踢，提示 "Failed to verify username"

可能原因：

1. Minecraft 侧没有配置代理。使用 authlib-injector 时，JVM 参数必须指向代理根路径（或 `/winnerproxy` 前缀）：

   ```text
   -javaagent:authlib-injector.jar=http://your-winnerproxy:2777
   ```

2. WinnerProxy 连不到 HRPAuth：日志里找 `hrpauth hasJoined error, falling back to mojang: ...`，并检查 `upstreams.hrpauth.url`（默认 `http://127.0.0.1:2778/yggdrasil-api/`）。
3. WinnerProxy 连不到 Mojang：日志里找 Mojang 相关错误。某些机房按 IP 段封 Mojang，把 `sessionserver.mojang.com` 与 `api.minecraftservices.com` 加白。

## Mojang 玩家进不去（503），HRPAuth 玩家正常

这是当前已记录的上游漂移：hasJoined 阶段三向 `POST /register` 发送 `{username, password, email, mojang_uuid}`，但上游路由现在要求 `identifier`，调用以 `400` 失败，代理回答 `503`。

- 每次受影响的加入都会在日志里产生 `hrpauth register failed: ...`
- 这不是代理的故障；HRPAuth 账号的加入（阶段一）不受影响
- 修法是把阶段三切换到 `POST /internal/proxy-register`（X-Internal-Key 来自 `POST /services/auth-key`），由 HA-Contract 的 WinnerProxy 开发契约跟踪

在此之前，Mojang 玩家需要一个 HRPAuth 账号并以 HRPAuth 方式登录才能进服。

## 批量查询返回 502

原先的漂移——客户端曾请求 `{base}/yggdrasil/api/profiles/minecraft`，relay 剥掉 `/yggdrasil-api` 后上游收到 `/yggdrasil/api/profiles/minecraft`（不是已注册的路由），回答 `500`——已于 2026-11-05 修复（WinnerProxy `4ded866`）。代理现在以无前缀形式请求 `POST /api/profiles/minecraft`。如今批量查询仅在上游回答 `404`（`{"error": "hrpauth batch endpoint missing"}`）或不可达（`{"error": "hrpauth upstream unavailable"}`）时以 `502` 失败；请检查 relay 是否注册了 `/api/profiles/minecraft` 路由、HRPAuth Yggdrasil API 服务是否在线。

## 玩家在 Mojang 改名后，游戏内 UUID 变了

游戏内 UUID 是 HRPAuth 侧的身份，不是 Mojang UUID，不会跟随 Mojang 改名。改名后阶段一、二看到的是新名字，阶段三（在注册漂移修复后）会为它新建一个账号。要保留原来的游戏内身份，玩家应修改自己 HRPAuth 账号的用户名（核心的 `/change-username`，WebUI 可用）。

## 日志：`username_already_bound, rejecting mojang player`

含义：一个 Mojang 玩家试图用已有账号的名字进服，而该账号绑定的是另一个 Mojang UUID。加入以 `204` 被拒绝。

排查：

1. 在上游找到该用户名的账号，记录它的 Mojang 绑定。
2. 与日志行里的 `uuid=` 比较。
3. 不同 → 有人在试图冒用已有身份。

处理：

- 合法玩家换了 Mojang 号：运维可以用 `/ha forcebind`（见下文）转移绑定，或让玩家先用真实账号进服。
- 攻击者：无需任何操作，拒绝本身就是保护。

## 日志：`hrpauth register failed`

阶段三失败。当前预期的原因就是上面的注册漂移（`400`）。其它可能：上游宕机或太慢（`upstreams.hrpauth.timeout_sec`，默认 10 秒），或 `upstreams.hrpauth` 的 OAuth2 凭据错误。

## 日志：`hrpauth hasJoined error, falling back to mojang`

阶段一中 HRPAuth 回答 5xx 或网络失败。WinnerProxy 继续走 Mojang，玩家仍可能进服，但每个请求都会记一条 WARN。检查 HRPAuth 健康与网络路径；上游只是慢的话，调大 `upstreams.hrpauth.timeout_sec`。

## 日志：`generate password failed`

少见；`crypto/rand` 失败。这是操作系统层面的问题（熵源缺失、容器没有 urandom）。修主机，不是修代理。

## 玩家怎么把 Mojang 账号绑到 HRPAuth？

历史上的 `POST /user/declare-email` 与 `mbe` 开关流程已不存在。当前路径：

- **认领流程（玩家）**：玩家在 Velocity 代理上执行 `/ha reg <email> <password>`，[HRPAuth Spigot](/zh/projects/hrpauth-spigot/) 插件通过核心的 `/yggdrasil-api` relay 调用 HRPAuth Yggdrasil API 的 `POST /admin/claim-user`，代理注册的账号变成带邮箱和密码的普通账号。
- **强制绑定（运维）**：`/ha forcebind <email> <password>` 调用 `POST /admin/force-bind`，把 Mojang UUID 从代理账号转移到目标账号。与认领一样走带 scope 的 OAuth2 服务令牌（`user.force-bind.as-service`）鉴权；历史上的管理令牌已废弃。
- **自助绑定开关**：HRPAuth Yggdrasil API 提供 `POST /player/mojang-bind-enable` 与 `POST /player/mojang-bind-disable`（玩家 Bearer 令牌）。开启后会挂一个 15 分钟倒计时，绑定未完成时标记会被自动清掉。

## 不用真实 Mojang 测试

在 `config.yml` 里关掉官方上游：

```yaml
upstreams:
  official:
    enabled: false
```

此时 Mojang 玩家在阶段二收到 `204`。要模拟 Mojang 200，本地起一个 mock 服务，把 `upstreams.official.url` 指向它。

## 多实例放在负载均衡后面

可以，但有代价：

- 资料缓存按实例独立，命中率下降
- 所有实例共用同一份 OAuth2 凭据
- 不需要状态同步，各实例最终收敛到同样的上游状态

单实例对大多数场景已经够用。

## 轮换上游凭据

1. 在 HRPAuth 上新建或轮换 WinnerProxy 使用的 OAuth2 客户端。
2. 更新 `config.yml` 中的 `upstreams.hrpauth.client_id` / `client_secret`（如果单独设置了 `hrpauth.client_id` / `client_secret`，一并更新）。
3. 重启 WinnerProxy。重启窗口内老实例仍用旧令牌，预期有几秒的上游调用失败。

## 相关页面

- [数据流转](/zh/projects/winnerproxy/data-flow)：逐阶段的请求流转
- [架构说明](/zh/projects/winnerproxy/architecture)：组件与身份模型
- [配置](/zh/projects/winnerproxy/configuration)：全部配置键
