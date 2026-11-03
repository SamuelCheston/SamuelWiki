# API 参考

代理对外暴露四个接口：两个服务于 CustomSkinLoader 客户端，一个把删除请求转发给上游服务，一个用于健康检查。本页说明它们的行为、报文与错误。

## 健康检查

`GET /health` 返回固定文档。

```http
GET /health HTTP/1.1
```

```json
{
  "status": "ok"
}
```

它不会访问上游服务，所以上游不可用时它依然正常响应。

## 玩家资料

`GET /:username.json` 返回玩家的 CSL 资料。

路径段必须以 `.json` 结尾。不带这个后缀时返回 `404`，响应体为空。

```http
GET /Player.json HTTP/1.1
```

```json
{
  "username": "Player",
  "textures": {
    "default": "1a2b3c4d5e6f",
    "cape": "7f8e9d0c1b2a",
    "elytra": "3c4d5e6f7a8b"
  }
}
```

- `username` 取自上游返回的资料
- `textures` 是"模型类型到纹理哈希"的映射
- `default` 是标准皮肤；上游 metadata 声明 slim 模型时，键会变成 `slim`
- `cape` 与 `elytra` 只在玩家拥有对应纹理时出现

这份文档由两次上游调用合成：`POST /api/profiles/minecraft` 与 `GET /sessionserver/session/minecraft/profile/{uuid}`。细节见[架构说明](/zh/projects/haskinproxy/architecture)。

### 状态码

- `200`：资料解析成功
- `404`：用户名无法解析，或上游返回错误

## 纹理代理

`GET /textures/:hash` 返回资料中某个哈希对应的原始纹理字节。

```http
GET /textures/1a2b3c4d5e6f HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: image/png
```

响应体就是图片本身，不是 JSON 包装。

### 缓存行为

响应内容取决于该纹理是否已在本地缓存中。

- 未命中：从上游拉取字节，`Content-Type` 取自上游响应，缺失时回退为 `image/png`；上游带上了 `Last-Modified` 与 `Cache-Control` 时会原样转发
- 命中：字节来自 `freecache`，`Content-Type` 为 `image/png`，并带上 `X-Cache: HIT`

未命中时不会出现 `X-Cache`，所以这个头能直接告诉你纹理是不是本地提供的。

### 状态码

- `200`：纹理字节
- `404`：上游返回错误，响应体为空

## 纹理删除

`POST /:username/texture/delete` 把删除请求转发给上游服务。

```http
POST /Player/texture/delete HTTP/1.1
Authorization: Bearer <user token>
Content-Type: application/json

{
  "profile_id": "00000000000000000000000000000001",
  "texture_type": "skin",
  "remember_token": "..."
}
```

上游接受 `remember_token`、`profile_id`、`texture_type`、`auth_type`、`uid`、`email` 这类字段。请按上游期望的结构提交请求体，代理不会改写它。

### 透传语义

- 请求体原样转发到上游的 `POST /texture/delete`
- 调用方的 `Authorization` 头原样转发，代理自己不做校验
- 上游的状态码与原始响应体原样返回给调用方
- 响应的 `Content-Type` 为 `application/json`

`:username` 这段路径只用于定位需要驱逐的本地缓存条目。上游返回 `2xx` 时，代理会删除 `profile:<username>` 以及该缓存资料引用到的每个 `tex:<hash>`。上游失败时不驱逐任何条目。

### 状态码

- `200` 或其它上游状态：上游响应，原样透传
- `400`：缺少用户名，或请求体无法读取
- `502`：连不上上游

## 错误格式

代理自己产生的错误使用统一格式。

```json
{
  "error": "upstream returned status 500"
}
```

- 资料接口在上游查询失败时返回 `404` 与这个格式的响应体
- 删除接口在缺少用户名或请求体无法读取时返回 `400`，内容为 `username required` 或 `cannot read body`；上游不可达时返回 `502`，内容是上游的错误文本
- 纹理代理返回 `404` 且响应体为空；健康检查不会失败

## 相关页面

- [概览](/zh/projects/haskinproxy/)
- [架构说明](/zh/projects/haskinproxy/architecture)
- [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)：代理所调用的上游路由
