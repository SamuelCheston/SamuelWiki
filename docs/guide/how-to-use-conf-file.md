# How to Use Config File

Quick-start samples for every service that reads a YAML file. The per-project configuration pages carry the full field reference; the samples here show the current shape.

## HRPAuth

Schema version `11`. Since the 2026-10 split the `yggdrasil.*` blocks live in the HRPAuth-Yggdrasil-API service, and the core gained `core_api`, `yggdrasil_api` and `sdk_packages`. Full reference: [Configuration & API](/projects/hrpauth/configuration).

```yaml
version: "11"
site:
    name: HRPAuth
    implementation: HRPAuth
    version: 1.0.0
server:
    port: ":2778"
    cors_origin: "*" # You can keep '*', but we recommend setting it to your frontend url.
callback:
    url: https://backend.auth.example.com/ # The backend callback url.
frontend:
    url: https://auth.example.com/ # The frontend site url.
database:
    host: 127.0.0.1
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
    token: "" # Legacy manage token, auto-generated on first startup. Do not use for new integrations.
security:
    password_cost: 10
    rate_limit_max_attempts: 10
    rate_limit_window_sec: 600
    enable_captcha: true
    captcha_ttl: 300
oauth2:
    issuer: "" # Defaults to callback.url.
    authorization_code_ttl_sec: 300
    access_token_ttl_sec: 3600
    refresh_token_ttl_sec: 2592000
    super_client_id: hrpauth-internal-super # Auto-generated secret; satellites use it for service-to-service calls.
    super_client_extra_scopes: []
    public_client_id: hrpauth-webui
    public_redirect_uris:
        - https://auth.example.com/oauth/callback
core_api:
    internal_key: "" # Auto-generated on first startup. The core reads no core_api value.
yggdrasil_api:
    base_url: http://localhost:2770 # Used by the core for the /internal/heartbeat ping.
    internal_key: "" # Auto-generated on first startup.
sdk_packages:
    storage_dir: ./data/sdk_packages
    max_package_size: 20971520
    max_packages: 128
```

## HRPAuth Yggdrasil API

The Yggdrasil protocol service. Its configuration carries the former `yggdrasil.*` blocks plus the relay and core-connection settings; see [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) for the details.

## Skin library (HASkinLib)

Schema version `6`.

```yaml
version: "6"
server:
    port: ":2701"
    cors: "*" # Keep '*', or set it to your frontend url.
database: # Often the same MySQL as HRPAuth.
    host: 127.0.0.1
    db_name: hrpauth
    user: hrpauth
    password: ""
    charset: utf8mb4
    table_prefix: ""
core_api: # The HRPAuth core this skinlib talks to.
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

Schema version `2`. Full reference: [WinnerProxy Configuration](/projects/winnerproxy/configuration).

```yaml
version: "2"
server:
    addr: ":2777"
    public_url: http://127.0.0.1:2777
    read_timeout_sec: 15
    write_timeout_sec: 15
cache:
    size: 104857600 # 0 disables the cache.
    ttl_sec: 300
log:
    level: info
    format: text
upstreams:
    official: # Do not change this if you do not know what you are doing.
        url: https://api.minecraftservices.com
        timeout_sec: 10
        enabled: true
    hrpauth: # The Yggdrasil upstream; note the /yggdrasil-api/ relay prefix.
        url: http://127.0.0.1:2778/yggdrasil-api/
        client_id: ""
        client_secret: ""
        timeout_sec: 10
        enabled: true
hrpauth: # The HRPAuth management root for presence, relay and SDK upload.
    url: http://127.0.0.1:2778
    client_id: "" # Falls back to upstreams.hrpauth credentials when empty.
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

## HASkinProxy (HASP)

```yaml
server:
    listen_addr: ":2702"
    public_url: http://localhost:2702
upstream: # The HRPAuth management root, with OAuth2 client credentials.
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
