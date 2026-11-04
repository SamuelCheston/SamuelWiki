# 架构说明

HRPAuth-Yggdrasil-API 承担 HA 认证体系中面向 Minecraft 的那一半。核心服务保存真实用户；本服务保存游戏账号、档案、令牌与纹理文件，并在需要确认用户身份时通过 OAuth2 回调核心服务。

## 分工

### 核心服务

- OAuth2 授权、业务接口与用户目录
- 本服务依赖的卫星服务接口：`/services/presence`、`/services/relay`、`/services/auth-key`、`/services/sdk-packages`
- 本服务在启动时读取一次的站点元信息

### 本服务

- Yggdrasil 协议接口
- `accounts`、`profiles`、`tokens`、`sessions`、`profile_keys`、`profile_properties` 表，统一使用 `haygg_` 前缀
- `yggdrasil.server.textures_storage` 下的纹理文件
- 内嵌的 WebUI SDK 包

两个服务之间唯一的纽带是核心用户身份。`accounts.core_user_id` 在核心用户注册游戏账号时写入。

## 启动顺序

1. `InitializeConfig` 在缺失时创建 `config.yaml` 与密钥对，或迁移旧版本文件
2. `config.Load` 把文件解析为运行期配置
3. `database.Init` 建立 MySQL 连接
4. `EnsureMigrations` 通过 golang-migrate 执行待应用的 SQL 迁移
5. `FetchMetadata` 从核心读取站点元信息；这一步失败只告警
6. `redis.Init` 建立 Redis 客户端
7. 后台清理任务启动
8. HTTP 服务绑定配置的端口
9. 两秒后在后台向核心注册自己，并上传 SDK 包

第 5 步刻意不致命。没有核心时服务依然能启动，只是元信息为空，且只有代理账号可以登录。

## 微服务注册

### Presence

服务向 `/services/presence` 提交一条 presence 记录。

- `name`：`microservice.name` 的值
- `ttl_seconds`：`microservice.ttl_seconds` 的值
- `security_level`：`0`，让中继过去的 Yggdrasil 路由保持匿名
- `scope.name`：`yggdrasil-api`
- `scope.frontend_areas`：`webui-dash`
- `root_metadata.yggdrasil`：与 `GET /` 返回的元信息文档一致

### Relay 规则

随后服务向 `/services/relay` 提交一组 relay 规则。每条规则把核心侧路径映射到本服务上的同名路径。

```text
core /yggdrasil-api/authserver   ->  relay_url/authserver
core /yggdrasil-api/sessionserver ->  relay_url/sessionserver
```

中继的路径清单在代码里是固定的：`/`、`/authserver`、`/sessionserver`、`/api/profiles/minecraft`、`/textures`、`/previews`、`/texture`、`/skin`、`/skins`、`/minecraftservices`、`/register`、`/player`、`/mojang`。

前缀取自 `microservice.relay_path_prefix`，默认是 `/yggdrasil-api`。目标取自 `microservice.relay_url`，必须是核心能访问到的地址。

### 内部密钥

注册的最后一步是调用 `/services/auth-key`，返回一个临时内部密钥。`/internal/heartbeat` 与 `/internal/proxy-register` 通过 `X-Internal-Key` 头回传这个密钥。密钥为空时这两个接口拒绝所有请求，而密钥为空恰好意味着核心从未连通过。

## 接口分层

### 协议层

游戏客户端访问的部分，鉴权走 `accessToken` 加 `clientToken`。

- `/authserver/*`：authenticate、refresh、validate、invalidate、signout
- `/sessionserver/session/minecraft/*`：join、hasJoined、profile
- `/api/profiles/minecraft`
- `/textures/:hash`、`/previews/:fileName`、`/texture/avatar/:uuid`
- `/minecraftservices/*`：聊天签名用的 certificates 与 public keys

### 业务层

WebUI SDK 调用的部分，鉴权走 Bearer Token，这个令牌可以是核心的 OAuth2 access token，也可以是 Yggdrasil access token。

- `/player`：账号摘要、游戏档案查询与创建、Mojang 绑定开关
- `/mojang/profile/:uuid`、`/texture/mojang/:uuid`：代理 Mojang sessionserver

### 内部层

只有核心会访问，且必须带上内部密钥。

- `/internal/heartbeat`
- `/internal/proxy-register`

### 管理层

认领与修复代理注册的账号，由 HRPAuth Spigot 插件经核心 relay 携带带 scope 的服务令牌调用。

- `/admin/claim-user`
- `/admin/force-bind`

## 令牌与档案模型

### 账号与档案

- `accounts` 是本地游戏账号。`core_user_id` 指向一个核心用户，`mojang_uuid` 指向一个正版账号，`cbh` 区分真人账号与代理账号。
- `profiles` 保存 Minecraft 角色。主键是不带短横线的 32 位 UUID，角色名唯一，模型为 `default` 或 `slim`。
- WebUI 流程为每个账号创建一个档案。UUID 可以是随机生成、由用户指定，或按正版用户名查得。

### 令牌

- `accessToken` 与 `clientToken` 存在 `tokens` 表
- 三种状态：`valid`、`temporarily_invalid`、`invalid`
- 用新的 `clientToken` 登录时，同一账号的其它令牌会被标记为 `temporarily_invalid`
- `yggdrasil.security.max_tokens_per_user` 限制单账号可持有的有效令牌数量，超出时先撤销最旧的

本地表里查不到的令牌会交给核心校验。核心认可后，服务把它当作绑定到对应本地账号的虚拟令牌。

### 会话

`/join` 按档案与服务器写入一条会话记录，附带客户端 IP，过期时间取自 `yggdrasil.security.session_expiry_seconds`。`hasJoined` 读回这条记录；开启 `enable_ip_check` 后还会比对请求 IP。

## 纹理处理链路

一次上传依次经过这些步骤。

1. 文件被解码，且必须是 PNG
2. 尺寸与 `max_texture_width`、`max_texture_height` 比对；超出但比例正确的图片给出 notice，比例失真的给出 warning
3. `22x17` 的披风会被缩放到 `64x32`
4. 校验后的 PNG 以 SHA-256 计算哈希，存为 `textures/<hash>`
5. 渲染 WebP 预览图，存为 `previews/<hash>_<type>.webp`
6. 皮肤会裁出头部，存为 `previews/<hash>_avatar.png`
7. `textures` 资料属性被改写为新 URL，并用 RSA over SHA-1 签名

属性里的 URL 由 `callback.url` 拼出。该值为空时，服务回退到核心提供的站点地址加上 relay 路径前缀，这样客户端与其余协议走同一条中继路径取到纹理。

替换纹理不会直接删除旧属性。旧行会被打上七天后的 `delete_when` 时间戳，并保留一份 tombstone 值，这样仍持有旧 URL 的客户端还能解析。每小时的清理任务会移除时间已过的行，以及没有被任何有效属性引用的文件。

写入方与清理任务通过 MySQL 咨询锁互斥，因此多个实例可以安全共用同一个存储目录。

## 后台任务

服务启动后会同时启动五个周期任务。

1. 令牌清理，每 1 小时
2. 会话清理，每 24 小时
3. 代理账号清理，每 24 小时
4. Mojang 绑定超时扫描，每 30 秒
5. 孤立纹理清理，每 1 小时

Mojang 绑定扫描很关键：开启绑定流程会给账号置上 `mbe`，并开始一个 15 分钟倒计时。用户若没有完成绑定，扫描会把该标记重新清掉。

## SDK 包投递

`sdk/` 目录通过 `go:embed sdk/*` 打进二进制。启动时服务把它打成 `tar.gz` 归档，根目录放 `manifest.json`，下面放 `src/` 目录树，然后上传到核心的 `/services/sdk-packages`。

- 包名来自 `manifest.json`
- `microservice.profile_cards` 会覆盖 manifest 中声明的资料卡片优先级，覆盖发生在归档构建之前
- 核心上已有同名包时，服务会删除旧包后重新上传
- 上传失败只告警；协议接口照常工作

核心通过 [HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/) 把这个包聚合进 WebUI 构建，声明的路由挂在 relay 前缀之下。

## 相关页面

- [概览](/zh/projects/hrpauth-yggdrasil-api/)
- [接口参考](/zh/projects/hrpauth-yggdrasil-api/api)
- [HRPAuth](/zh/projects/hrpauth/)：本服务注册到的核心服务
