# Architecture

HASkinProxy 是一个无状态的翻译层，只有一份本地缓存和一个上游依赖。本页沿着请求走一遍，并说明这个服务如何挂接到 HRPAuth 上。

## 资料翻译链路

CSL 客户端请求 `Player.json`。代理把它变成两次上游调用加一份 JSON 文档。

```text
GET /Player.json
  -> 缓存查找：profile:Player
  -> POST {upstream}/yggdrasil-api/api/profiles/minecraft   body ["Player"]
  -> GET  {upstream}/yggdrasil-api/sessionserver/session/minecraft/profile/{uuid}
  -> 解 base64 的 "textures" 属性
  -> 取出 SKIN / CAPE / ELYTRA 三个 url
  -> 取每个 url 的最后一段路径作为纹理哈希
  -> 重新组装成 CSL 纹理映射
  -> 写入缓存并返回
```

### 纹理映射

上游的 `textures` 属性是一个 base64 字符串，解码后是一段 JSON。代理从中读取三项。

- `SKIN`：哈希存到模型类型下；上游 metadata 里没有 `model` 键时用 `default`，否则用 metadata 的取值，例如 `slim`
- `CAPE`：存到 `cape`
- `ELYTRA`：存到 `elytra`

最终得到的是"模型类型到哈希"的扁平映射，这正是 CSL 协议期望的结构。

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

没有的纹理就是不出现在映射里。某个属性解码失败会被跳过，其余部分照常返回。

## 缓存层

缓存是进程内的单个 `freecache` 实例，用两个键前缀存放两类数据。

- `profile:<username>`：翻译后的 CSL 文档，以 JSON 存储，TTL 取自 `cache.profile_ttl`
- `tex:<hash>`：原始纹理字节，不做任何加工，TTL 取自 `cache.texture_ttl`

容量上限来自 `cache.max_size_mb`，默认 256 MB。到达上限时由 `freecache` 自行淘汰，代理不参与容量管理。

两类数据的生存时间故意不同。资料会随玩家换皮肤而变化，纹理文件不会。

### 驱逐

唯一显式发生的驱逐发生在纹理删除成功之后。

- 删除 `profile:<username>` 条目
- 一并删除该缓存资料里引用到的每个 `tex:<hash>` 条目

如果资料本来就没被缓存，就拿不到任何纹理哈希，此时只删资料条目，纹理条目交给 TTL 自然过期。

## 上游接入

代理访问的是同一个上游服务的两个不同前缀。

- `{upstream.base_url}/yggdrasil-api`：Yggdrasil 流量，包括资料查询、会话资料、纹理字节、纹理删除
- `{upstream.base_url}`：HRPAuth 的微服务扩展层

与 HRPAuth 的接入由三组调用组成，全部在启动时发起，且都不阻塞启动流程。

### Presence

`POST /services/presence` 把代理注册进 HRPAuth 的在线状态注册表。请求里声明服务名、来自 `presence.ttl_seconds` 的自声明生存时间，以及覆盖 `webui-dash` 前端区域的 scope。

### Relay

`POST /services/relay` 发布一条规则：主服务 origin 上的目标路径 `/csl` 被转发到 `server.public_url`。主服务会剥掉这个前缀，因此 `/csl/Player.json` 到达代理时是 `/Player.json`。

所以 `server.public_url` 必须是 HRPAuth 能访问到的地址。它为空时不会注册 relay 规则。

### SDK 包

`POST /services/sdk-packages` 以 `multipart/form-data` 上传编译期 SDK 包。同名包已存在时上游返回 `409`，代理会删掉旧包再传一次，因此每次重启都会把远端包收敛到内嵌的源码版本。

这一组调用里的任何失败都只记为告警，既不会终止代理进程，也不会影响 HTTP 服务启动。

## 编译期 SDK 包

`sdk/` 目录通过 `embed.FS` 嵌入二进制，因此不需要在可执行文件旁边额外分发文件。

- `sdk/manifest.json` 描述这个包：名称、版本、路由 `/customskinloader`、模块 `src/pages/CSLSetup`，以及菜单与看板条目
- `sdk/src/pages/CSLSetup.tsx` 是 React 页面，用来生成 CustomSkinAPI 的 `config.json` 并说明安装方式

启动时这棵源码树被打成内存中的 `tar.gz`，归档根目录是 `manifest.json`，随后上传到 HRPAuth。[HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/) 会把它聚合进 Web UI 构建。

`/customskinloader` 页面由 Web UI 自身提供，不是代理的运行时路由。

## 鉴权边界

代理不对自己的调用方做鉴权。

- 读接口是开放的。CSL 客户端没有可出示的凭据，资料查询与纹理下载都以匿名方式返回。
- 纹理删除接口把调用方的 `Authorization` 头原样透传给上游，请求体也一并原样转发。凭据是否有效由上游判断。
- 代理访问上游时使用自己的 OAuth2 服务令牌，通过 `client_credentials` 模式在 `{upstream.base_url}/oauth/token` 换取。只有当请求自身没有带 `Authorization` 头时才使用该令牌，并在令牌过期前一直复用。
- 上游请求超时取自 `upstream.timeout`。

由于删除接口是透传的，没有凭据的调用者可以绕过代理的检查直接打到上游删除路由。如果你直接暴露这个代理，需要在它前面加上自己的访问控制。

## 路由装配

路由注册在 `internal/router`：先 `/health`，随后是 `GET /:username`、`GET /textures/:hash` 与 `POST /:username/texture/delete`。

- `/textures/:hash` 与 `/:username` 通配共存，因为 Gin 会先匹配字面量 `textures` 段，再落到根通配
- `/:username` 处理资料请求，要求路径段以 `.json` 结尾，否则返回 `404`

## 相关页面

- [概览](/zh/projects/haskinproxy/)
- [API 参考](/zh/projects/haskinproxy/api)
- [HRPAuth 架构说明](/zh/projects/hrpauth/architecture)：上游侧的微服务扩展层
