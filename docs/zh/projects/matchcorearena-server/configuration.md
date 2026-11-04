# 配置

服务只读取一个 YAML 文件，即 `config/config.yaml`。文件里带一个 `version`，加载器要么匹配它，要么把它迁移上来，要么拒绝启动。本页说明这个生命周期，然后逐块讲解配置。

## 版本化配置文件

### 版本如何校验

文件路径取自 `CONFIG_PATH` 环境变量，回落到 `config/config.yaml`。

- 文件不存在：按当前默认值创建，并写入当前版本号
- 文件存在：先按通用 map 解析，这样未知字段不会破坏迁移这一步
- 缺少 `version` 或不是合法的 `x.y.z`：加载失败，没有宽松降级
- `version` 低于代码支持的版本：按迁移链逐级升级
- `version` 高于代码支持的版本：加载失败，并提示你升级程序

迁移完成后会再次比对版本号，与代码内置版本不一致同样视为错误。迁移链走不到目标版本时也是错误。

### 迁移链

代码当前支持 `1.4.0`。

- `1.0.0` 到 `1.1.0`：新增 `auth` 块，其中 `hrpauth` 为空默认值
- `1.1.0` 到 `1.2.0`：把 `auth.hrpauth` 重构为单一的 `base_url`。取值沿用旧的 `issuer`，并去掉结尾的 `/oauth2` 或 `/.well-known/openid-configuration`
- `1.2.0` 到 `1.3.0`：新增 `auth.hrpauth.public_client_id`，默认值为 `hrpauth-webui`
- `1.3.0` 到 `1.4.0`：新增 `auth.maintenance_token`，键不存在时生成一段 64 位随机十六进制字符串

改动配置结构时，要在同一次变更里提升 `CurrentVersion`、追加迁移函数，并同步更新 `config/config.example.yaml`。

## 必填项

校验在迁移之后执行，作用于强类型结构体。

- `server.port` 必须落在 1 到 65535 之间
- `database.host` 与 `database.name` 不能为空
- `database.max_open_conns` 与 `database.max_idle_conns` 不能为负数
- `auth.hrpauth.base_url` 不能为空

其余字段都有默认值。

## 主要配置块

### `server`

- `host`：监听地址，默认 `0.0.0.0`
- `port`：监听端口，默认 `9178`
- `read_timeout_seconds`：默认 `15`
- `write_timeout_seconds`：默认 `15`

### `database`

- `host`、`port`、`user`、`password`：MySQL 连接
- `name`：数据库名，默认 `matchcorearena`
- `max_open_conns`：默认 `50`
- `max_idle_conns`：默认 `10`

数据库本身必须已经存在，迁移只会在里面建表。

### `redis`

- `host`、`port`、`password`、`db`：默认 `localhost:6379`，使用 `0` 号库

Redis 只有两个用途：令牌校验缓存，以及 UUID 到 UID 的缓存。

### `auth.hrpauth`

- `base_url`：HRPAuth 的根地址，例如 `http://localhost:2778`。客户端会在后面拼接自己需要的路径，例如 `/status`、`/oauth/login-ticket`、`/totp/verify`、`/oauth/token`、`/oauth/revoke`、`/user`、`/user/lookup-uuid`
- `public_client_id`：OAuth2 public client ID，默认 `hrpauth-webui`

### `auth.maintenance_token`

运维超级凭据。它拥有全部 scope，在令牌校验时最先被比对。

创建配置文件时该值会自动生成，是一段 64 位随机十六进制字符串。运维控制台发送的 Bearer 令牌就是它。

## tokens.yaml，服务凭据

`config/tokens.yaml` 保存系统之间使用的高权限凭据，独立于 HRPAuth 用户体系。它在启动时加载，加载失败只记一条告警。

文件不存在时会自动生成两个条目。

- `super-admin`：uid 为 `-1`，scope 为 `maintenance`
- `match-reporter`：uid 为 `-100`，scope 为 `match:report` 与 `user:read`

两个令牌都是 32 字节随机值写成十六进制。

校验器按以下顺序比对凭据。

1. 配置文件里的 `auth.maintenance_token`
2. `config/tokens.yaml` 中的每一个令牌
3. 用调用方自己的 Bearer 令牌请求 HRPAuth `POST /user`

这个文件没有版本号，也没有迁移机制。新增条目需要手写。

## 常见坑

- 从 `1.1.0` 或更早版本迁移上来的配置，最终 `auth.hrpauth.base_url` 会是空值，因为这个值取自旧的 `issuer` 字段，而那个字段通常是空的。需要手工补上，校验不接受空的 base URL
- `version` 高于二进制版本是硬错误，不是告警。应该升级程序，而不是降级文件
- 自动生成的配置文件与 `config/config.example.yaml` 曾在 `auth.hrpauth.base_url` 上不一致：生成的文件用 `http://localhost:2778`，模板曾用 `http://localhost:8080`。2026-11-05 已把模板纠正为 `2778`（HRPAuth 默认端口），两者现一致
- `config/tokens.yaml` 被提交进仓库，而 `config/config.yaml` 在 gitignore 中。仓库里那份带的是占位令牌，但任何写进去的真实令牌都会进入 git 历史
- `server.read_timeout_seconds` 与 `server.write_timeout_seconds` 会被读取和校验，但从未生效。服务通过 `r.Run(addr)` 启动，没有设置任何超时
- Docker 镜像不带配置文件，`.dockerignore` 排除了 `config.yaml` 与 `config.example.yaml`。容器首次启动时会在 `/app/config` 下生成 `config/config.yaml`
- `migrate.RunMigrations` 只执行 `migrations/baseline.sql`，第二个迁移文件被内嵌却从不执行，见[架构说明](/zh/projects/matchcorearena-server/architecture)
- `database.name` 决定迁移作用在哪个库上。指错库会让表建在错误的地方

## 相关页面

- [概览](/zh/projects/matchcorearena-server/)
- [架构说明](/zh/projects/matchcorearena-server/architecture)
- [配置文件使用指南](/zh/guide/how-to-use-conf-file)：本生态 YAML 配置文件的通用约定
