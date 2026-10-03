# How to Use Config File

## HRPAuth
sample config file:
```yaml
callback:
    url: //The backend url to handle request.
database: // DB configuration
    charset: utf8mb4
    db_name: hrpa
    host: 127.0.0.1
    password: hrpa
    user: hrpa
frontend:
    url: // Frontend url.
keygen:
    enable: 0
manage:
    token: // Manage token(legacy). It will be generated automatically.
   oauth2:
    access_token_ttl_sec: 3600
    authorization_code_ttl_sec: 300
    issuer:  // Oauth2 issuer. Often same as callback url.
    public_client_id: hrpauth-webui //Oauth2 public client id.
    public_redirect_uris:
        -  // https://your-frontend-url/oauth/callback // Oauth2 redirect uri.
    refresh_token_ttl_sec: 2592000
    super_client_extra_scopes: []
    super_client_id: hrpauth-internal-super // Oauth2 super client id.
    super_client_secret: d2914e67d02616be853d7c067df440cc18475782c6d647fe4b712fb7fd78e493 // Oauth2 super client secret. Microservice use it to call super client api. It will be generated automatically.
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
    cors_origin: '*' // You can keep it as '*'. But we recommend you to set it to your frontend url.
    port: :2778
site:
    implementation: HRPAuth zggdrasil-api service
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
        implementation: HRPAuth zggdrasil-api service
        links:
            homepage: ""
            register: ""
        name: HRPAuth
        signature_private_key_path: private_key.pem
        signature_public_key_path: public_key.pem
        skin_domains: []
        textures_storage: ./
        version: "5526"

```

## Skin library
sample config file:
```yaml
database: //Often same as HRPAuth.
  charset: utf8mb4
  db_name: hrpa
  host: 127.0.0.1
  password: hrpa
  user: hrpa
server:
  cors: "*" // We recommend you to keep it as '*'. But you can set it to your frontend url if you do not want to share your skinlib resources.
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
sample config file:
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
    official: // Do not change this if you do not know what you are doing.
        url: https://api.minecraftservices.com
        timeout_sec: 10
        enabled: true
    hrpauth: // Change this to your HRPAuth url and super client id/secret.
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
sample config file:
```yaml
server: // HASP server configuration.
    listen_addr: :2702
    public_url: http://localhost:2702
upstream: // Change this to your HRPAuth url and manage token. (Its required token is going to be changed to OAuth2 client id/secret.)
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