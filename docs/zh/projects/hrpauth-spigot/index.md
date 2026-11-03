# HRPAuth Spigot

HRPAuth Spigot 是一个 Velocity 代理插件，负责把游戏内玩家身份绑定或迁移到 HRPAuth 平台账号。它以 OAuth2 客户端的身份通过 HTTP 与 HRPAuth 核心通信，本身不监听任何端口。

## 覆盖范围

- 用邮箱和密码认领代理侧注册的游戏账号
- 强绑：把 Mojang UUID 从代理账号迁移到目标账号
- 通过 `client_credentials` 授权获取并缓存服务令牌
- `/ha` 及其别名 `/hrpauth` 下的运维命令

## 技术栈

- Java 25
- Gradle Kotlin DSL 与 Gradle Wrapper
- `com.velocitypowered:velocity-api:4.1.1-SNAPSHOT`，编译期依赖
- `org.yaml:snakeyaml:2.2` 负责配置文件
- 全部请求走 JDK 自带的 `java.net.http.HttpClient`，没有第三方 HTTP 库
- 不使用数据库

## 目录结构

```text
src/main/java/com/hrp/auth/proxy/
  HrpAuthProxy.java      # 插件入口：加载配置、校验凭据、注册命令
  OAuthClient.java       # client_credentials 令牌获取与缓存
  RegisterCommand.java   # /ha reg
  ForceBindCommand.java  # /ha forcebind
  config/Config.java     # 配置加载与首次启动生成
src/main/resources/velocity-plugin.json
build.gradle.kts、settings.gradle.kts、gradlew、gradle/
```

## 运行方式

### 运行前准备

- Java 25
- 一个运行中的 HRPAuth 核心
- 一个 Velocity 代理服务器

### 构建

```bash
./build.sh
```

这个脚本等价于执行 `./gradlew build`，产物是 `build/libs/HRPAuth-Proxy-1.0-SNAPSHOT.jar`。

### 运行

把 jar 放进 Velocity 的 `plugins/` 目录，然后启动代理。插件只是 HRPAuth 核心的客户端，默认地址是 `http://127.0.0.1:2778`。

## 配置

配置文件位于 `plugins/hrpauth-proxy/config.yml`，首次启动时自动生成，并带一大段注释。

```yaml
hrpauth:
  url: http://127.0.0.1:2778
  client-id: ""
  client-secret: ""
  manage-token: ""
  timeout-sec: 10
  verify-tls: true
presence:
  enabled: true
  name: HRPAuth-Proxy
  ttl-seconds: 0
  security-level: 0
site:
  name: HRPAuth-Proxy
  version: 1.0.0
log:
  level: info
  format: text
```

没有自动迁移。每次启动都用 snakeyaml 解析文件，缺失的键回落到内置默认值。

- `hrpauth.url`：HRPAuth 核心地址
- `hrpauth.client-id` 与 `hrpauth.client-secret`：OAuth2 客户端凭据。生成的注释指向核心配置里的 `oauth2.super_client_id` 与 `oauth2.super_client_secret`，也可以用 `grant_type=client_credentials` 单独创建一个 OAuth2 客户端
- `hrpauth.manage-token`：管理令牌，只有强绑命令需要
- `hrpauth.timeout-sec` 与 `hrpauth.verify-tls`：HTTP 超时与 TLS 校验开关
- `presence.*`：会被读入配置对象，但没有任何代码路径用它在核心上注册服务在线状态
- `site.*`：命令横幅里展示的名称与版本
- `log.*`：会被读入配置对象，但插件实际直接使用 Velocity 的 logger

凭据缺失不会阻止插件启动。它照常启动，只打印一条 WARN，提示你编辑配置后重启。

## 命令

这些命令只能由玩家执行。`/ha` 与 `/hrpauth` 两种写法都已注册。

### `/ha reg <email> <password>`

认领执行者自己的代理侧注册账号。

```http
POST /admin/claim-user HTTP/1.1
Host: 127.0.0.1:2778
Content-Type: application/json
Authorization: Bearer <service_token>

{"username":"<player name>","email":"<email>","password":"<password>"}
```

玩家名从代理会话中读取，因此不是命令参数。

### `/ha forcebind <email> <password>`

把玩家的 Mojang UUID 从代理侧注册账号迁移到目标账号。

```http
POST /admin/force-bind HTTP/1.1
Host: 127.0.0.1:2778
Content-Type: application/json
Authorization: Bearer <service_token>

{"username":"<player name>","email":"<email>","password":"<password>","manage_token":"<manage_token>"}
```

### 服务令牌

两条命令都先需要服务令牌。插件用 `client_credentials` 授权获取：

```http
POST /oauth/token HTTP/1.1
Host: 127.0.0.1:2778
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=<client_id>&client_secret=<client_secret>
```

令牌缓存在内存里，并在 `expires_in` 到期前 30 秒主动刷新。

### 错误码

认领命令会解析响应体中的这些错误码：

- `user_not_claimable`：账号已被认领，或本来就不是代理侧注册的账号
- `username_already_bound`：该玩家名已绑定到别的账号
- `user_not_found`：没有与玩家名匹配的未认领账号
- `email_already_registered`：该邮箱已被注册

强绑命令会解析这些：

- `user_not_found`：没有与玩家名匹配的代理侧注册账号
- `target_not_found`：目标账号不存在
- `invalid_credentials`：目标账号的邮箱或密码不正确
- `invalid_manage_token`：配置里的管理令牌不正确
- `no_mojang_uuid`：代理侧注册账号没有可迁移的 Mojang UUID

## 当前状态

插件会调用两个管理路由：`POST /admin/claim-user` 与 `POST /admin/force-bind`。

- 当前 HRPAuth 源码里没有注册这两个路由。对着用现有代码构建的核心跑，两个命令都打不通。
- 这两个路由只存在于 HRPAuth 核心 `build/` 目录下的预编译二进制中，只有跑这些二进制才可用。
- 契约本身仍有文档。HA-Contract 的 OpenAPI 定义了 `/admin/claim-user` 与 `/admin/force-bind` 及其请求体，其 HRPAuth 数据模型文档描述了运维认领与强绑流程，路线图条目里把后端处理器标为尚未实现。
- 这个仓库没有详细的设计文档，README 只是一份简短摘要，上面的内容全部由源码反推。
- 命名不一致的地方容易踩坑。仓库名叫 HRPAuth-Spigot，但插件本身是 Velocity 插件，不是 Spigot 或 Bukkit 插件。插件 id 是 `hrpauth-proxy`，而 Gradle 根项目名是 `HRPAuth-Proxy`。

## 与其它项目的关系

- **依赖** [HRPAuth](/zh/projects/hrpauth/)，通过 HTTP 访问令牌接口与管理路由
- **是** HRPAuth 家族中唯一的游戏侧消费者
- **不依赖** [HRPAuth Web](/zh/projects/hrpauth-web/)、[HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)，也不直接依赖 MySQL 与 Redis

## 相关页面

- [HRPAuth](/zh/projects/hrpauth/)：这个插件所对接的核心
- [API 规范](/zh/projects/ha-contract/api-standards)：管理路由遵循的契约
- [HRPAuth Web](/zh/projects/hrpauth-web/)：账号被认领之后可以使用的账号门户
