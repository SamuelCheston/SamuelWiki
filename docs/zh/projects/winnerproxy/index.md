# WinnerProxy

WinnerProxy 是 HA 生态的加入代理。它把 HRPAuth 与官方 Mojang 收束到同一个上游接口之后，并在 Mojang 玩家首次加入服务器时自动在 HRPAuth 里注册一个代理账号。

## 覆盖范围

- 一个 Yggdrasil 入口，同时服务 HRPAuth 账号与官方 Mojang 账号
- 三阶段 `hasJoined` 流程：HRPAuth 记录、Mojang 校验、代理注册
- Mojang 玩家首次加入时自动在 HRPAuth 创建代理账号（当前受上游契约漂移阻塞，见[架构说明](/zh/projects/winnerproxy/architecture#已知的上游漂移)）
- 无论走哪条登录路径，游戏端看到的都是同一个稳定的 HRPAuth UUID
- 短 TTL 的进程内资料缓存
- Presence 与 relay 注册，让启动器和 WebUI 都能访问到代理

## 技术栈

- Go 1.26.4、Gin v1.12
- coocood/freecache 承载进程内资料缓存
- gopkg.in/yaml.v3 读取配置
- 无数据库，无 Redis

## 目录结构

```text
main.go                # 入口、配置加载、presence 与 relay 注册
config/                # 配置结构体与默认值
internal/handler/      # Yggdrasil 分发、hasJoined 流程、资料与批量查询
internal/proxy/        # 上游抽象层与 HRPAuth、Mojang 实现
internal/hrpauth/      # HRPAuth HTTP 客户端、端点与数据结构
internal/router/       # Gin 路由装配
internal/cache/        # 缓存接口、freecache 与 noop 实现
sdk/                   # 供 WebUI 使用的编译期 SDK 包
build/                 # 预编译产物与运行期配置
```

## 运行方式

### 运行前准备

- HRPAuth，并且能通过管理面根地址访问（默认 `http://127.0.0.1:2778`）
- 能访问 `https://api.minecraftservices.com`，除非把 `upstreams.official.enabled` 设为 `false`
- HRPAuth 上供 WinnerProxy 使用的 OAuth2 客户端
- 可写的二进制同目录，用于存放 `config.yml`

### 构建

```bash
go build -o ./build/winnerproxy
```

### 运行

```bash
./build/winnerproxy
```

默认监听 `:2777`。presence 握手失败时进程会继续运行，失败只写进日志，不影响其它功能。

## 配置

`config.yml` 位于可执行文件所在目录，不在项目根目录。文件不存在时服务会写入一份默认配置，并提示你编辑后重启；文件存在时，缺失的配置项会回落到内置默认值。

- `server`：监听地址、对外地址、读与写超时
- `cache`：缓存容量与 TTL
- `log`：日志级别与格式
- `upstreams.hrpauth`：HRPAuth 的 Yggdrasil 上游与凭据
- `upstreams.official`：官方 Mojang 上游
- `hrpauth`：HRPAuth 管理面根地址、presence 与 SDK 上传
- `site`：服务名称与构建版本

逐字段说明见 [配置](/zh/projects/winnerproxy/configuration)。

## 与其它项目的关系

- **依赖** [HRPAuth](/zh/projects/hrpauth/) 做全部身份判断，并读取它的 Yggdrasil API
- **代理** 官方 Mojang，因此一个启动器入口即可服务两类账号
- **通过** HRPAuth 的微服务扩展层注册自身，提交 presence 与 relay 规则
- **提供 SDK 包**，由 [HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/) 注入 WebUI 构建
- **关联** [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)，后者提供同样的协议但没有 Mojang 回落

## 相关页面

- [架构说明](/zh/projects/winnerproxy/architecture)：一次加入查询在代理内部如何流转
- [数据流转](/zh/projects/winnerproxy/data-flow)：逐阶段的请求细节
- [接口参考](/zh/projects/winnerproxy/api)：代理暴露的端点
- [配置](/zh/projects/winnerproxy/configuration)：完整的配置参考
- [部署](/zh/projects/winnerproxy/deployment)：二进制、systemd 与容器部署
- [故障排查](/zh/projects/winnerproxy/troubleshooting)：日志与常见故障
- [HRPAuth](/zh/projects/hrpauth/)：代理背后的服务
