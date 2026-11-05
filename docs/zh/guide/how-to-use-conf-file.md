# 配置文件使用

每个读取 YAML 配置的服务都有一份快速上手示例。逐字段的完整参考在各项目的配置页，这里只展示当前结构。

## HRPAuth

配置结构版本 `13`。自 2026-10 拆分后，`yggdrasil.*` 块属于 HRPAuth-Yggdrasil-API 服务，核心新增了 `core_api`、`yggdrasil_api` 与 `sdk_packages`。完整参考：[配置与接口](/zh/projects/hrpauth/configuration)。

```yaml
version: "13"
site:
    name: HRPAuth
    implementation: HRPAuth
    version: 1.0.0
server:
    port: ":2778"
    cors_origin: "*" # 可以保留 '*'，但建议设为前端地址。
callback:
    url: https://backend.auth.example.com/ # 后端回调地址。
frontend:
    url: https://auth.example.com/ # 前端站点地址。
database:
    host: 127.0.0.1 # 只放主机名，端口有独立字段（旧的内联 ip:port 写法仍然兼容）。
    port: 3306
    db_name: hrpauth
    user: hrpauth
    password: ""
    charset: utf8mb4
    retry_interval_sec: 3
    max_retries: 5
    next_round_delay_min: 5
verification_code:
    code_ttl: 600
    storage_dir: ./cache/verification_codes
redis:
    host: 127.0.0.1
    port: 6379
    password: ""
    db: 0
    prefix: hrpauth_
smtp:
    host: smtp.example.com
    port: 587
    username: ""
    password: ""
    encryption: tls
    from_email: no-reply@example.com
    from_name: HRPAuth
manage:
    token: "" # 管理令牌，首次启动自动生成。可作为管理凭据使用；服务间调用请优先使用 OAuth2 super client。
security:
    password_cost: 10
    rate_limit_max_attempts: 10
    rate_limit_window_sec: 600
    enable_captcha: true
    captcha_ttl: 300
oauth2:
    issuer: "" # 默认取 callback.url。
    authorization_code_ttl_sec: 300
    access_token_ttl_sec: 3600
    refresh_token_ttl_sec: 2592000
    super_client_id: hrpauth-internal-super # 密钥自动生成，卫星服务用它发起服务间调用。
    super_client_extra_scopes: []
    public_client_id: hrpauth-webui
    public_redirect_uris:
        - https://auth.example.com/oauth/callback
    service_clients: [] # 可选；每项：client_id、client_secret、可选 name。启动时幂等种子；空列表或缺省不产生任何登记。
core_api:
    internal_key: "" # 首次启动自动生成。核心不读取任何 core_api 值。
yggdrasil_api:
    base_url: http://localhost:2770 # 核心用它发起 /internal/heartbeat 探活。
    internal_key: "" # 首次启动自动生成。
sdk_packages:
    storage_dir: ./data/sdk_packages
    max_package_size: 20971520
    max_packages: 128
```

## HRPAuth Yggdrasil API

Yggdrasil 协议服务。它的配置包含 `yggdrasil.*` 块，以及 relay 与核心连接相关设置；详见 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)。

## 皮肤库（HASkinLib）

配置结构版本 `7`。

```yaml
version: "7"
server:
    port: ":2701"
    cors: "*" # 可保留 '*'，也可设为前端地址。
database: # 通常与 HRPAuth 共用同一个 MySQL。
    host: 127.0.0.1
    port: 3306 # v7 起有独立端口字段（旧的内联 ip:port 写法仍然兼容）。
    db_name: hrpauth
    user: hrpauth
    password: ""
    charset: utf8mb4
    table_prefix: ""
core_api: # 皮肤库对接的 HRPAuth 核心。
    base_url: http://127.0.0.1:2778
    client_id: ""
    client_secret: ""
textures:
    storage_dir: ./data/textures
    preview_storage_dir: ./data/previews
    max_upload_bytes: 2097152
    max_request_bytes: 2359296
    rate_limit_per_minute: 5
    rate_limit_window_seconds: 60
```

## WinnerProxy

配置结构版本 `2`。完整参考：[WinnerProxy 配置](/zh/projects/winnerproxy/configuration)。

```yaml
version: "2"
server:
    addr: ":2777"
    public_url: http://127.0.0.1:2777
    read_timeout_sec: 15
    write_timeout_sec: 15
cache:
    size: 104857600 # 0 表示关闭缓存。
    ttl_sec: 300
log:
    level: info
    format: text
upstreams:
    official: # 不清楚用途时不要改。
        url: https://api.minecraftservices.com
        timeout_sec: 10
        enabled: true
    hrpauth: # Yggdrasil 上游，注意 /yggdrasil-api/ relay 前缀。
        url: http://127.0.0.1:2778/yggdrasil-api/
        client_id: ""
        client_secret: ""
        timeout_sec: 10
        enabled: true
hrpauth: # HRPAuth 管理面根地址，用于 presence、relay 与 SDK 上传。
    url: http://127.0.0.1:2778
    client_id: "" # 留空时回落到 upstreams.hrpauth 的凭据。
    client_secret: ""
    presence:
        enabled: true
        name: WinnerProxy
        ttl_seconds: 0
    sdk:
        enabled: true
        url: ""
site:
    name: WinnerProxy
    version: 0.2.0
```

## HASkinProxy（HASP）

```yaml
server:
    listen_addr: ":2702"
    public_url: http://localhost:2702
upstream: # HRPAuth 管理面根地址，使用 OAuth2 客户端凭据。
    base_url: http://localhost:2778
    timeout: 10
    client_id: ""
    client_secret: ""
cache:
    profile_ttl: 3600
    texture_ttl: 86400
    max_size_mb: 256
presence:
    enabled: true
    name: HASkinProxy
    ttl_seconds: 0
```
