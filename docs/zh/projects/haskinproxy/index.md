# HASkinProxy

HASkinProxy 是一个轻量代理，把 Yggdrasil 的资料数据翻译成 CustomSkinLoader (CSL) 协议，并代理它背后的纹理文件。本页说明这个代理负责什么、如何构建、以及如何运行。

## 覆盖范围

- 把 Yggdrasil 资料属性翻译成 CustomSkinLoader 客户端期望的 CSL 资料 JSON
- 先把用户名解析成 UUID，再从上游取完整的会话资料
- 代理纹理字节，让客户端在不需要上游原生支持的情况下加载皮肤、披风与鞘翅
- 把纹理删除请求透传给上游，并清理对应的本地缓存
- 以微服务身份注册到 HRPAuth，并发布暴露 CSL API 的 relay 路径
- 随二进制提供编译期 SDK 包，让 HRPAuth Web UI 拥有 CustomSkinLoader 配置页

## 技术栈

- Go 1.24、Gin v1.9.1
- `coocood/freecache` 在内存中缓存资料与纹理字节
- `gopkg.in/yaml.v3` 负责读取配置文件
- `golang.org/x/oauth2` 的 `clientcredentials` 授权模式用于获取上游服务令牌

没有数据库，也没有 Redis。所有状态都留在进程内。

## 目录结构

```text
main.go                # 入口：加载配置、装配组件、presence 与 SDK 上报、启动服务
sdkdata.go             # 用 embed.FS 把 sdk/ 源码树嵌入二进制
sdk_upload.go          # 把嵌入的 sdk/ 打成 tar.gz 并上传
config/                # 配置结构、默认值与自动生成
internal/handler/      # CSL 处理器：资料翻译、纹理代理、删除透传
internal/hrpauth/      # 上游 HRPAuth / Yggdrasil 客户端，含 OAuth2 服务令牌
internal/router/       # Gin 路由装配
internal/cache/        # freecache 封装：JSON 缓存、原始字节缓存与驱逐
internal/model/        # CSL 与 Yggdrasil 数据结构
sdk/                   # 编译期 SDK 包：manifest.json 与 React 页面
build/                 # 预编译产物与运行期配置
```

## 运行方式

### 运行前准备

- Go 1.24 或更高版本
- 一个可达的上游 Yggdrasil 服务，默认是 `http://localhost:2778`
- 如果需要 presence 握手、relay 规则或 SDK 包上传，还需要 HRPAuth

### 构建

```bash
go build -o ./build/hasp .
```

### 运行

```bash
./build/hasp
```

代理默认监听 `:2702`。README 也记录了用于开发的 `go run main.go`。

## 配置

配置文件是 `config.yaml`，放在**可执行文件同目录**而不是工作目录，因此无论从哪里启动都能找到它。首次运行会自动生成默认配置。

- `server.listen_addr`：监听地址，默认 `:2702`
- `server.public_url`：对外可达的基础地址，作为 relay source 上报给 HRPAuth
- `upstream.base_url`：上游 Yggdrasil 服务，默认 `http://localhost:2778`
- `upstream.timeout`：上游请求超时秒数，默认 `10`
- `upstream.client_id`、`upstream.client_secret`：换取 OAuth2 `client_credentials` 服务令牌用的凭据
- `cache.profile_ttl`：资料缓存时长秒数，默认 `3600`
- `cache.texture_ttl`：纹理缓存时长秒数，默认 `86400`
- `cache.max_size_mb`：缓存上限 MB，默认 `256`
- `presence.enabled`：是否向 HRPAuth 注册，默认 `true`
- `presence.name`：在线状态注册表里的服务名，默认 `HASkinProxy`
- `presence.ttl_seconds`：自声明的记录生存时间，`0` 表示永不过期
- `sdk.enabled`：是否上传编译期 SDK 包，默认 `true`

逐项说明见 [API 参考](/zh/projects/haskinproxy/api)。

## 与其它项目的关系

- **依赖** [HRPAuth](/zh/projects/hrpauth/) 作为上游 Yggdrasil 服务，请求走它的 `/yggdrasil-api` 前缀
- **注册到** HRPAuth 的 `POST /services/presence`、`POST /services/relay`、`POST /services/sdk-packages`
- **遵循** [HA-Contract](/zh/projects/ha-contract/) 的微服务扩展与 SDK 包契约
- **被消费于** 运行 CustomSkinLoader 的 Minecraft 客户端，以及渲染该 SDK 包的 [HRPAuth Web UI](/zh/projects/hrpauth-web/)
- **与** [HASkinLib](/zh/projects/haskinlib/) 并列，后者存储并分发上游所暴露的纹理

## 相关页面

- [架构说明](/zh/projects/haskinproxy/architecture)：资料如何变成 CSL 响应，缓存与上游握手如何工作
- [API 参考](/zh/projects/haskinproxy/api)：四个接口的报文与错误格式
- [HRPAuth](/zh/projects/hrpauth/)：上游服务与 `/services/*` 扩展层
