# 接口参考

HASkinLib 暴露八个路由，没有 `/api` 前缀。其中两个用于分发文件，且是公开的；除两个探针外，其余接口需要 HRPAuth 颁发的 OAuth2 Bearer Token。

## 接口清单

| 方法 | 路径 | 鉴权 | 作用 |
|---|---|---|---|
| `POST` | `/texture/upload` | Bearer | 上传 PNG 皮肤或披风并生成预览图 |
| `GET` | `/texture/listpreview` | 无 | 分页的预览元数据 |
| `GET` | `/texture/preview/:preview_file` | 无 | 分发 WebP 预览图文件 |
| `GET` | `/texture/pull/:hash` | 无 | 分发原始 PNG 文件 |
| `POST` | `/texture/delete` | Bearer | 删除属于自己的材质 |
| `GET` | `/profile/textures` | Bearer | 自己的材质列表，当前暂时搁置 |
| `GET` | `/example` | 无 | 存活检查 |
| `GET` | `/health` | 无 | 健康探针 |

## 响应结构

所有 JSON 响应共用同一个信封结构。

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture uploaded successfully",
  "data": {}
}
```

失败时 `success` 变为 `false`，并附带两遍相同的错误码。

```json
{
  "success": false,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "file is required",
  "code": "texture_file_required",
  "error": "texture_file_required"
}
```

请求 ID 取自你传入的 `X-Request-Id` 请求头，也会通过同名响应头回传。

## 鉴权方式

需要鉴权的接口从请求头读取令牌。

```http
Authorization: Bearer <access_token>
```

令牌在 HRPAuth 核心接口处校验。

## 上传

`POST /texture/upload` 接收 `multipart/form-data`。

- `type`：必填，`skin` 或 `cape`
- `model`：可选，`default` 或 `slim`，只对皮肤有效，默认 `default`
- `name`：必填
- `description`：可选
- `tags`：可选，多个标签可用英文逗号、中文逗号、分号、竖线、制表符或换行分隔
- `file`：PNG 文件，`texture` 是它的兼容字段名

### 尺寸规则

- 皮肤只接受 `64x32` 或 `64x64`。
- 披风只接受 `64x32` 或 `22x17`。
- `22x17` 的披风会在服务端贴到透明的 `64x32` 画布上，落盘的是标准化之后的文件。
- 名称最多保留 20 个字符。
- 文件必须是合法 PNG。解码后的像素会重新编码再存储，所以落盘字节与上传字节并不相同。

### 体积上限

- `textures.max_upload_bytes`，默认 `2` MiB，作用于单个文件。
- `textures.max_request_bytes`，默认 `2` MiB 加 256 KiB，作用于整个请求。

### 响应

新建记录返回 `201 Created`。

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture uploaded successfully",
  "data": {
    "id": 12,
    "hash": "8c9b0f...",
    "type": "skin",
    "uid": 10001,
    "model": "slim",
    "width": 64,
    "height": 64,
    "file_name": "my-skin.png",
    "preview_file": "8c9b0f..._skin.webp",
    "name": "Blue Girl",
    "description": "demo skin",
    "tags": "展示,蓝色",
    "created_at": "2026-08-02 12:00:00",
    "updated_at": "2026-08-02 12:00:00"
  }
}
```

同一个用户再次上传同一个文件会更新元数据，返回 `200 OK`，message 为 `texture metadata updated successfully`。披风的响应里没有 `model` 字段。

```bash
curl -X POST "http://127.0.0.1:2701/texture/upload" \
  -H "Authorization: Bearer <access_token>" \
  -F "type=skin" \
  -F "model=slim" \
  -F "name=Blue Girl" \
  -F "description=demo skin" \
  -F "tags=展示,蓝色" \
  -F "file=@skin.png"
```

## 预览列表

`GET /texture/listpreview` 只返回元数据，不返回图片二进制。

- `type`：可选，`all`、`default`、`slim` 或 `cape`，默认 `all`
- `order`：可选，`asc` 或 `desc`，默认 `desc`
- `tag`：可选，按标签筛选
- `page`：可选，正整数，默认 `1`

每页固定 16 条。`type=all` 只包含皮肤，不包含披风。

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture preview list retrieved successfully",
  "data": {
    "items": [
      {
        "id": 12,
        "hash": "8c9b0f...",
        "type": "skin",
        "model": "slim",
        "uid": 10001,
        "width": 64,
        "height": 64,
        "file_name": "my-skin.png",
        "preview_file": "8c9b0f..._skin.webp",
        "name": "Blue Girl",
        "description": "demo skin",
        "tags": "展示,蓝色",
        "created_at": "2026-08-02 12:00:00",
        "updated_at": "2026-08-02 12:00:00"
      }
    ],
    "filter": "all",
    "order": "desc",
    "tag": "",
    "page": 1,
    "page_size": 16,
    "total": 28,
    "has_more": true
  }
}
```

`data` 里的字段会在信封顶层重复一份，所以 `items` 和分页字段不需要进 `data` 就能读到。

```bash
curl "http://127.0.0.1:2701/texture/listpreview?type=slim&order=asc&page=2"
```

## 预览图与原图

两个接口都是公开的。

`GET /texture/preview/:preview_file` 接收一个 `.webp` 文件名，例如 `8c9b0f..._skin.webp`，响应 `Content-Type: image/webp`。

`GET /texture/pull/:hash` 接收文件的 64 位 SHA-256，响应 `Content-Type: image/png`。

两者都会带上 `Cache-Control: public, max-age=86400`。

```bash
curl "http://127.0.0.1:2701/texture/preview/8c9b0f..._skin.webp" --output preview.webp
curl "http://127.0.0.1:2701/texture/pull/8c9b0f..." --output texture.png
```

## 删除

`POST /texture/delete` 接收 `multipart/form-data`，包含 `type` 与 `hash`。它只删除归属调用者的记录，无法指定其他用户。

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture deleted successfully",
  "data": {
    "id": 12,
    "hash": "8c9b0f...",
    "type": "skin",
    "uid": 10001,
    "model": "slim",
    "name": "Blue Girl",
    "file_name": "my-skin.png",
    "preview_file": "8c9b0f..._skin.webp"
  }
}
```

```bash
curl -X POST "http://127.0.0.1:2701/texture/delete" \
  -H "Authorization: Bearer <access_token>" \
  -F "type=skin" \
  -F "hash=8c9b0f..."
```

## 个人材质列表

`GET /profile/textures` 返回调用者自己的材质，`type` 可选 `all`、`skin` 或 `cape`。

该接口已经实现，但目前处于暂时搁置状态，按不可用对待。

## 错误码

| 错误码 | HTTP | 含义 |
|---|---|---|
| `invalid_request` | `400` | 参数缺失或格式不对 |
| `invalid_texture_type` | `400` | type 必须是 `skin` 或 `cape` |
| `invalid_texture_model` | `400` | model 必须是 `default` 或 `slim` |
| `texture_file_required` | `400` | 没有传 `file` 或 `texture` |
| `invalid_texture_file` | `400` | 文件不是合法 PNG |
| `invalid_texture_size` | `400` | 尺寸不符合规则 |
| `texture_name_required` | `400` | 名称为空 |
| `oauth_login_required` | `401` | 没有传 Bearer 令牌 |
| `oauth_invalid_grant` | `401` | 令牌无效、过期或已被撤销 |
| `texture_not_found` | `404` | 该用户与哈希没有对应记录 |
| `preview_not_found` | `404` | 磁盘上没有这个预览文件 |
| `upload_request_too_large` | `413` | 请求或文件超过上限 |
| `upload_rate_limited` | `429` | 被上传限流器拒绝 |
| `storage_not_configured` | `500` | 配置里的存储目录为空 |
| `texture_upload_failed` | `500` | 上传流程失败 |
| `profile_query_failed` | `500` | 个人材质查询失败 |
| `internal_error` | `500` | 其它服务端错误 |

## 已知注意事项

- 删除材质会无条件移除磁盘上的原图与预览图。另一个用户上传过同一文件时，他的数据库记录还在，但文件没了，他的 `pull` 与 `preview` 调用会开始失败。
- `remember_token` 与 `rt` 表单字段已经废弃，只认 Bearer 令牌。
- `GET /profile/textures` 处于搁置状态。
- 列表接口的 `type=all` 不包含披风。
- 标签筛选只取已存标签串里的第一个标签。
- 目前还没有材质详情接口和材质编辑接口。

## 相关页面

- [概览](/zh/projects/haskinlib/)
- [架构说明](/zh/projects/haskinlib/architecture)
