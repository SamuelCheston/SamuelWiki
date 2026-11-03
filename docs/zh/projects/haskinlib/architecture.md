# 架构说明

HASkinLib 是一个分层很薄的服务。处理器放在 `controllers/`，业务规则放在 `services/`，持久化放在 `models/` 与 `database/`。判断一个决定由哪一层负责，是读这份代码最快的方式。

## 分层

### Controller

- 解析并校验请求
- 只调用一个 Service
- 通过 `controllers/api_response.go` 统一组装响应
- 公共鉴权步骤放在 `controllers/auth.go`

### Service

- `services/upload_service.go`：PNG 校验、尺寸标准化、预览渲染、哈希计算，以及写回列表表
- `services/delete_texture_service.go`：删除记录，并强制清理磁盘文件
- `services/upload_rate_limiter.go`：进程内的上传限流器

### 持久化

- `models/models.go` 映射 `TextureListSkin` 与 `TextureListCape`，表名由 `database.table_prefix` 推导
- `database/database.go` 建立 GORM 连接
- `database/migrations/` 保存内嵌的 SQL 文件

## 上传与预览生成流程

```text
POST /texture/upload
  -> UploadController：请求体上限、Bearer 鉴权、限流
  -> TextureUploadService：PNG 解码、尺寸规则、标准化
  -> 对标准化后的 PNG 计算 SHA-256
  -> 渲染预览并编码为 WebP
  -> 写入 storage_dir 的 <hash>，写入 preview_storage_dir 的 <hash>_<type>.webp
  -> 写入 <prefix>texture_list_skin 或 <prefix>texture_list_cape
```

有几处细节会直接影响你读代码时的判断。

- 哈希算在标准化之后的 PNG 上，所以 22x17 的披风和它的 64x32 版本共用同一个哈希、同一份文件。
- 原图按哈希命名保存，不带扩展名。
- 皮肤预览是 2D 全身渲染图，披风预览是披风正面平铺图。
- 预览用 `nativewebp` 以最佳压缩级别编码，再用最近邻放大八倍。
- 同一个用户再次上传同一个文件时走更新流程，响应是 `200 OK` 而不是 `201 Created`。

## 存储布局

- 原图：`textures.storage_dir/<sha256>`，不带扩展名
- 预览图：`textures.preview_storage_dir/<sha256>_<type>.webp`
- 元数据：`<prefix>texture_list_skin` 与 `<prefix>texture_list_cape`，两张表都对 `(uid, hash)` 建了唯一约束

## 从共享数据库到独立数据库

早期版本与 HRPAuth 共用同一个库，并直接读取 `users`、`oauth2_access_tokens`、`profiles` 三张表。现在服务跑在自己的数据库上，通过 HTTP 访问 HRPAuth。

- 两张列表表带上 `hasl_` 前缀，不再与 HRPAuth 的表冲突。
- 前缀在启动时套用到内嵌的迁移 SQL 上，同一套迁移文件可以适配任意前缀。
- 鉴权改走 HRPAuth 核心接口，这里不再读取任何令牌表。
- `startup_controller.go` 要求 `schema_migrations` 是标准表结构。检测到共享时期遗留的 `service` 列时，进程直接报错退出，并提示切换到独立数据库。
- 共享时期的迁移历史无法复用，独立数据库从基准迁移重新开始。

改表时，旧耦合仍然是风险点。指向 HRPAuth 数据库的部署和指向独立数据库的部署，看到的不是同一份数据。

## 鉴权方式

- 客户端发送 `Authorization: Bearer <access_token>`。
- `controllers/auth.go` 把令牌转发给 `POST <core_api.base_url>/internal/verify-token`。
- 校验通过后，再通过 `GET <core_api.base_url>/services/users/<uuid>` 刷新用户信息，并用其中的 `uid` 作为材质的归属者。
- 服务间调用使用由 `core_api.client_id` 与 `core_api.client_secret` 构造的 clientcredentials 令牌。这两项为空时，客户端会退回未认证调用，由核心接口决定是否接受。
- `GET /texture/preview/:preview_file` 与 `GET /texture/pull/:hash` 是公开接口，不需要令牌。

## 限流与缓存

- 上传限流器是 `services/upload_rate_limiter.go` 里的进程内滑动窗口。
- 每次上传会检查两遍，一遍按 Bearer 令牌，一遍按客户端 IP。
- 没有 Redis，也没有共享计数器，所以这个上限是按实例生效的。
- 服务本身不缓存材质或预览图。唯一的缓存是预览与拉取接口上的 `Cache-Control: public, max-age=86400` 响应头。

## 相关页面

- [概览](/zh/projects/haskinlib/)
- [接口参考](/zh/projects/haskinlib/api)
