# 配置

WinnerProxy 只读取可执行文件所在目录下的一个 `config.yml`。本页说明这个文件从哪来，以及每个配置块负责什么。

## 文件位置与版本

- 文件名是 `config.yml`，扩展名是 `.yml`，它位于可执行文件旁边，不在项目根目录
- 文件不存在时，服务会写入一份默认配置，并在日志里提示你编辑后重启；凭据需要通过编辑文件填入
- 文件存在时，配置值会覆盖在内置默认值之上，因此漏写的配置项会保持默认值
- 文件带有 `version: "2"`，表示配置结构版本。WinnerProxy 不会迁移旧文件，只会用当前默认值补齐缺失的键

Docker 镜像在 `/app` 下运行二进制，因此文件位于 `/app/config.yml`。入口脚本支持用 `CONFIG_TEMPLATE` 与 `RENDERED_CONFIG` 从模板渲染出这份文件。

## 顶层结构

- `server`
- `cache`
- `log`
- `upstreams`
- `hrpauth`
- `site`
- `version`

## server

```yaml
server:
  addr: ":2777"
  public_url: "http://127.0.0.1:2777"
  read_timeout_sec: 15
  write_timeout_sec: 15
```

- `addr`：HTTP 服务监听地址
- `public_url`：客户端可访问的地址。它是 relay 规则的一侧，也是 WebUI 上展示的地址
- `read_timeout_sec`、`write_timeout_sec`：读取请求与写出响应的超时秒数

## cache

```yaml
cache:
  size: 104857600
  ttl_sec: 300
```

- `size`：缓存容量，单位是字节，默认 100 MiB。设为 `0` 会关闭缓存，所有查询都直接打到上游
- `ttl_sec`：资料在缓存中的存活秒数，默认 300。小于等于 `0` 时回落到 5 分钟

## log

```yaml
log:
  level: "info"
  format: "text"
```

- `level`：`debug`、`info`、`warn` 或 `error`
- `format`：`text` 或 `json`

## upstreams

### `upstreams.hrpauth`

```yaml
upstreams:
  hrpauth:
    url: "http://127.0.0.1:2778/yggdrasil-api/"
    client_id: ""
    client_secret: ""
    timeout_sec: 10
    enabled: true
```

- `url`：HRPAuth 的 Yggdrasil 上游，Yggdrasil 调用会发到这里
- `client_id`、`client_secret`：换取令牌用的 OAuth2 客户端凭据。留空时启动日志会告警，所有需要代理鉴权的请求都会失败
- `timeout_sec`：单次请求超时秒数
- `enabled`：是否启用该上游

### `upstreams.official`

```yaml
  official:
    url: "https://api.minecraftservices.com"
    timeout_sec: 10
    enabled: true
```

- `url`：官方 Mojang 服务
- `timeout_sec`：单次请求超时秒数。设为 `0` 表示不限制 HTTP 客户端超时
- `enabled`：设为 `false` 表示不启用 Mojang 回落，此时 Mojang 玩家会得到 `204`

## HRPAuth 管理面

```yaml
hrpauth:
  url: "http://127.0.0.1:2778"
  client_id: ""
  client_secret: ""
  presence:
    enabled: true
    name: "WinnerProxy"
    ttl_seconds: 0
  sdk:
    enabled: true
    url: ""
```

这个块指向 HRPAuth 的管理面根地址，而不是 Yggdrasil 上游。presence 握手、relay 注册和 SDK 上传都走这里。

- `url`：管理面根地址，默认值 `http://127.0.0.1:2778` 是正确的
- `client_id`、`client_secret`：管理面凭据。`client_id` 为空时会回落到 `upstreams.hrpauth` 的凭据，同时 URL 也回落到上游地址去掉 `/yggdrasil-api` 之后的根地址
- `presence.enabled`：启动时是否执行 presence 握手
- `presence.name`：在 HRPAuth 中注册的服务名
- `presence.ttl_seconds`：注册记录的有效期。`0` 表示记录永不过期
- `sdk.enabled`：启动时是否把 SDK 包上传到 HRPAuth
- `sdk.url`：SDK 页面展示的 API 地址。留空时使用 relay 注册得到的地址

## site

```yaml
site:
  name: "WinnerProxy"
  version: "0.2.0"
```

关于本次部署的非运行期元信息。名称会出现在 presence 注册里，版本用来确认当前跑的是哪个构建。

## 容易忽略的细节

- 文件是 `config.yml`，不是 `config.yaml`。二进制旁边的 `config.yaml` 会被忽略，服务反而会重新写一份默认配置
- `hrpauth.url` 必须是管理面根地址。写成 `/yggdrasil-api` 会让 presence 与 relay 调用打错地方
- `server.public_url` 必须是使用 relay 的客户端能访问到的地址。它为空时 relay 注册会被跳过，WebUI 也无法路由到代理
- `cache.size = 0` 是关闭缓存的开关，它不表示"不限制大小"
- `upstreams.official.enabled = false` 会彻底去掉 Mojang 路径，包括 Mojang 玩家的自动注册
- 客户端凭据是 HRPAuth 上的 OAuth2 客户端，站内业务 access token 在这里不可用
- 漏写配置项不会报错。服务保持默认值并继续运行

## 联调检查

全新启动后，先检查这两个接口。

- `GET /health`
- `GET /winnerproxy`

两个都有响应，说明监听已就绪且 HRPAuth 可达。presence 握手的结果只体现在日志和 WebUI 里。

## 相关页面

- [概览](/zh/projects/winnerproxy/)
- [架构说明](/zh/projects/winnerproxy/architecture)
- [配置文件使用指南](/zh/guide/how-to-use-conf-file)
