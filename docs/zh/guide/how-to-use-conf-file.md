# 配置文件使用指南

## HRPAuth
配置文件示例：
```yaml
callback:
    url: // 处理请求的后端 URL。
database: // 数据库配置
    charset: utf8mb4
    db_name: hrpa
    host: 127.0.0.1
    password: hrpa
    user: hrpa
frontend:
    url: // 前端 URL。
keygen:
    enable: 0
manage:
    token: // 管理令牌（旧版）。它将自动生成。
oauth2:
    access_token_ttl_sec: 3600
    authorization_code_ttl_sec: 300
    issuer:  // Oauth2 发行者。通常与 callback url 相同。
    public_client_id: hrpauth-webui // Oauth2 公共客户端 ID。
    public_redirect_uris:
        -  // https://your-frontend-url/oauth/callback // Oauth2 重定向 URI。
    refresh_token_ttl_sec: 2592000
    super_client_extra_scopes: []
    super_client_id: hrpauth-internal-super // Oauth2 超级客户端 ID。
    super_client_secret: d2914e67d02616be853d7c067df440cc18475782c6d647fe4b712fb7fd78e493 // Oauth2 超级客户端密钥。微服务使用它来调用超级客户端 API。它将自动生成。
redis:
    db: 0
    host: 127.0.0.1
    password: ""
    port: 6379
    prefix: hrpauth_
security:
    captcha_ttl: 300
    enable_captcha: true
    password_cost: 10
    rate_limit_max_attempts: 10
    rate_limit_window_sec: 600
server:
    cors_origin: '*' // 您可以保持为 '*'。但我们建议您将其设置为您的前端 URL。
    port: :2778
site:
    implementation: HRPAuth zggdrasil-api 服务
    name: HRPAuth
    version: "62526"
smtp:
    encryption: tls
    from_email: no-reply@mcnb.dev
    from_name: HRPAuth
    host: 127.0.0.1
    password: ""
    port: 25
    username: ""
storage:
    orphan_file_expiry_days: 7
verification_code:
    code_ttl: 600
    storage_dir: ./cache/verification_codes
version: "7"
yggdrasil:
    feature_flags:
        enable_mojang_anti_features: false
        enable_profile_key: false
        legacy_skin_api: true
        no_mojang_namespace: false
        non_email_login: true
        username_check: true
    security:
        max_texture_file_size: 512000
        max_texture_height: 1024
        max_texture_width: 1024
        max_tokens_per_user: 10
        session_expiry_seconds: 28800
        token_expiry_days: 15
    server:
        implementation: HRPAuth zggdrasil-api 服务
        links:
            homepage: ""
            register: ""
        name: HRPAuth
        signature_private_key_path: private_key.pem
        signature_public_key_path: public_key.pem
        signature_public_key_path: public_key.pem
        skin_domains: []
        textures_storage: ./
        version: "5526"

```

## 皮肤库
配置文件示例：
```yaml
database: // 通常与 HRPAuth 相同。
  charset: utf8mb4
  db_name: hrpa
  host: 127.0.0.1
  password: hrpa
  user: hrpa
server:
  cors: "*" // 我们建议您保持为 '*'。但如果您不想共享皮肤库资源，可以将其设置为您的前端 URL。
  port: :2701
textures:
  max_request_bytes: 2359296
  max_upload_bytes: 2097152
  preview_storage_dir: ./data/previews
  rate_limit_per_minute: 5
  rate_limit_window_seconds: 60
  storage_dir: ./data/textures
version: "4"
```

## WinnerProxy
配置文件示例：
```yaml
server:
    addr: :2777
    read_timeout_sec: 15
    write_timeout_sec: 15
cache:
    size: 104857600
    ttl_sec: 300
log:
    level: info
    format: text
presence:
    enabled: true
    name: WinnerProxy
    ttl_seconds: 0
upstreams:
    official: // 如果您不知道自己在做什么，请不要更改此项。
        url: https://api.minecraftservices.com
        timeout_sec: 10
        enabled: true
    hrpauth: // 将此更改为您的 HRPAuth url 和超级客户端 ID/密钥。
        url: http://127.0.0.1:2778
        client_id: "hrpauth-internal-super"
        client_secret: "d2914e67d02616be853d7c067df440cc18475782c6d647fe4b712fb7fd78e493"
        timeout_sec: 10
        enabled: true
site:
    name: WinnerProxy
    version: 0.2.0
version: "2"
```

## HASP
配置文件示例：
```yaml
server: // HASP 服务器配置。
    listen_addr: :2702
    public_url: http://localhost:2702
upstream: // 将此更改为您的 HRPAuth URL 和管理令牌。（其所需的令牌将更改为 OAuth2 客户端 ID/密钥。）
    base_url: http://localhost:2778
    timeout: 10
    manage_token: ""
    enable_manage: false
cache:
    profile_ttl: 3600
    texture_ttl: 86400
    max_size_mb: 256
presence:
    enabled: true
    name: HASkinProxy
    ttl_seconds: 0
```
