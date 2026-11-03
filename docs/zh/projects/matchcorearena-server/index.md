# MatchCoreArena Server

MatchCoreArena Server 是 MatchCoreArena 竞技对战平台的中心后端。它管理用户、好友、战队、对局与排行榜，并且是唯一进行 Elo 积分结算的权威方。

## 覆盖范围

- 用户资料、经验与排位积分
- 好友申请与好友列表
- 战队与战队成员
- 对局上报与个人对局历史
- 按排行类型与赛季划分的排行榜
- 面向运维的 SQL 通道

## 技术栈

- Go 1.26.4、Gin v1.12
- MySQL，驱动为 `go-sql-driver/mysql`
- Redis，客户端为 `go-redis/v9`
- 配置用 `goccy/go-yaml`，请求 ID 用 `google/uuid`
- Docker 多阶段构建，镜像暴露 `9178`
- [HRPAuth](/zh/projects/hrpauth/) 既是 OAuth2 身份提供者，也是透明认证代理

## 目录结构

```text
api/                # router.go 与 HTTP 层
  router.go         # 路由注册与依赖装配
  handler/          # auth、user、friend、team、match、ranking、maintenance
  middleware/       # request_id、recovery、auth
config/             # 版本化配置加载、校验与迁移
  config.yaml       # 运行期配置
  config.example.yaml
  tokens.yaml       # 高权限服务凭据
internal/
  apperr/           # 业务错误码
  auth/             # HRPAuth 客户端与令牌校验
  rating/           # Elo 算法
  response/         # 统一响应信封
  service/          # 业务层
migrate/            # 内嵌 SQL 迁移
  embed.go
  migrations/baseline.sql
  migrations/20260918_add_match_participants.sql
redis/              # Redis 客户端
build/              # 预编译产物 mca
HA-Contract         # 指向共享契约仓库的符号链接
bwrel.md            # 关于 BedwarsRel-MCA 统计机制的调研笔记
main.go
Dockerfile
```

## 运行方式

### 运行前准备

- MySQL
- Redis
- 一个可达的 HRPAuth 实例
- 一个可写的工作目录，用于 `config/config.yaml` 与 `config/tokens.yaml`

### 构建

```bash
go build -o build/mca .
```

### 运行

```bash
./build/mca
```

启动顺序是固定的：加载配置、执行迁移、连接 MySQL、连接 Redis、初始化 HRPAuth 客户端、加载 `config/tokens.yaml`，最后启动 Gin。

默认监听地址是 `0.0.0.0:9178`，Docker 镜像暴露同一个端口。

仓库没有 README，也没有 Makefile，构建过程就是上面这两条命令。

## 配置

`config/config.yaml` 在缺失时按默认值创建，当文件版本低于当前二进制支持的版本时按迁移链逐级升级。`CONFIG_PATH` 环境变量可以覆盖文件路径。

- `version`：配置结构版本，代码当前支持 `1.4.0`
- `server`：监听地址与读写超时
- `database`：MySQL 连接与连接池大小
- `redis`：Redis 连接
- `auth.hrpauth`：HRPAuth 根地址与 OAuth2 public client ID
- `auth.maintenance_token`：运维超级凭据

`config/tokens.yaml` 是单独一份高权限服务凭据文件，首次加载时自动生成，包含 `super-admin` 与 `match-reporter` 两个条目。

逐字段说明见[配置](/zh/projects/matchcorearena-server/configuration)。

## 与其它项目的关系

- **依赖** [HRPAuth](/zh/projects/hrpauth/) 作为 OAuth2 身份提供者，并把登录、TOTP、刷新与吊销请求透传给它
- **被消费于** [MatchCoreArena Client](/zh/projects/matchcorearena-client/) 和 [MatchCoreArena MaintenanceView](/zh/projects/matchcorearena-maintenanceview/)
- **接收对局上报** 来自 [BedwarsRel-MCA](/zh/projects/bedwarsrel-mca/)，它用 `match-reporter` 凭据向 `/api/matches` 提交数据
- **共享契约** 通过 `HA-Contract` 符号链接接入 [HA-Contract](/zh/projects/ha-contract/)

## 相关页面

- [架构说明](/zh/projects/matchcorearena-server/architecture)：一个请求如何在服务内部流转，一次积分结算如何完成
- [配置](/zh/projects/matchcorearena-server/configuration)：版本化配置参考、迁移链与服务凭据
- [MatchCoreArena MaintenanceView](/zh/projects/matchcorearena-maintenanceview/)：通过运维 SQL 通道访问本服务的运维控制台
