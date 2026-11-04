# HASkinLib

HASkinLib 是 HA 生态的皮肤与披风库。它接收 PNG 材质上传、生成 WebP 预览图、提供分页列表，并通过一套独立的小型 HTTP 接口对外分发原始文件。

## 覆盖范围

- 带尺寸校验的 PNG 皮肤与披风上传
- 上传时同步生成 WebP 预览图
- 支持按类型、标签、排序筛选的分页预览列表
- 面向游戏客户端的公开预览图与原图接口
- 仅允许删除调用者自己的材质

## 技术栈

- Go 1.25、Gin v1.12
- GORM 与 MySQL 存放两张材质列表表
- golang-migrate 执行数据库迁移
- goccy/go-yaml 读取配置
- nativewebp 在进程内编码 WebP
- golang.org/x/oauth2 clientcredentials 访问 HRPAuth 核心接口
- 只依赖 MySQL，不使用 Redis

## 目录结构

```text
main.go        # 入口、路由注册、CORS 与请求 ID 中间件
config/        # 配置加载与版本迁移
controllers/   # HTTP 处理器
services/      # 上传、删除与上传限流逻辑
models/        # 皮肤与披风列表的 GORM 模型
database/      # 数据库连接与 SQL 迁移
clients/       # HRPAuth 核心接口客户端
utils/         # 核心接口的 OAuth2 clientcredentials 封装
docs/          # skinlib-api.md 接口参考
build/         # 预编译产物
```

## 运行方式

### 运行前准备

- MySQL，并且准备好 HASkinLib 专用的数据库
- 一个正在运行的 HRPAuth 核心接口
- HRPAuth 上一组可供 HASkinLib 使用的 OAuth2 客户端凭据
- 一个可写的工作目录，用于 `config.yaml` 与材质文件

### 构建

```bash
go build -o ./build/hasl
```

`./build.sh` 执行的就是同一条命令。

### 运行

```bash
./build/hasl
```

默认监听 `:2701`。首次运行会写入 `config.yaml`、创建 `./data/textures` 与 `./data/previews`、执行数据库迁移，并按 `hasl_` 前缀建出 `texture_list_skin` 与 `texture_list_cape` 两张表。

## 配置

`config.yaml` 位于工作目录。首次运行会写入默认配置，并在文件里标记 `version: "7"`。版本较旧的文件会逐级迁移，迁移前先把原文件备份为 `config.yaml.bak.<version>`。

- `server`：监听端口与 CORS 来源
- `database`：MySQL 连接与表前缀
- `core_api`：HRPAuth 基础地址与 OAuth2 客户端凭据
- `textures`：存储目录、体积上限与上传限流

`textures` 这一块同时约束上传接口。体积上限与对应的错误码见 [接口参考](/zh/projects/haskinlib/api)。

## 与其它项目的关系

- **依赖** [HRPAuth](/projects/hrpauth/)，所有身份判断都通过核心接口完成
- **被** [HRPAuth Web](/projects/hrpauth-web/) 的皮肤库页面使用：上传、列表、拉取、预览与删除
- **对外服务** 游戏客户端，通过公开的预览与拉取接口取图
- **早期版本** 与 [HRPAuth](/projects/hrpauth/) 共用数据库，现在改为独立库

## 相关页面

- [架构说明](/zh/projects/haskinlib/architecture)：分层结构、上传与预览生成流程，以及改为独立数据库的演进
- [接口参考](/zh/projects/haskinlib/api)：接口清单、请求结构、错误码与尺寸规则
