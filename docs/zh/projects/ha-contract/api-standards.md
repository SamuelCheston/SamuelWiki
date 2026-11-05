# API 规范

所有 HA 业务接口都用同一个封装返回，报错时给出已登记的错误码，并声明自己的鉴权级别。本页说明这些规则，以及你如何校验它们。

## 方向规则

OpenAPI 文件定义契约，代码要匹配它。两者不一致时，改的是代码。

这条规则适用于生态里的每一个服务，不只是目前已经有 OpenAPI 文件的那几个。

## 统一响应格式

### 成功响应

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "..."
  },
  "meta": {
    "request_id": "ab12cd34"
  }
}
```

- `success` 为 `true`
- `data` 承载业务数据
- `meta.request_id` 每个响应都会带上，排查问题时把它贴出来

过渡期内部分成功字段会同时镜像到顶层，避免旧前端立刻失效。新接入方一律从 `data` 读取。

### 错误响应

```json
{
  "success": false,
  "message": "Invalid email",
  "code": "invalid_email",
  "error": "invalid_email",
  "meta": {
    "request_id": "ab12cd34"
  }
}
```

- `code` 是标准的错误字段
- `error` 是兼容别名，值与 `code` 相同，用来保证既有调用方不被打断
- 失败响应里不出现 `data`

业务接口的 base path 是 `/`，在每个 OpenAPI 文件的 `servers` 块里声明。

## 分页

列表接口用 `page_num` 与 `page_size` 两个查询参数。`page_num` 从 `1` 开始，`page_size` 默认 `20`，上限 `100`。目前这套约定只在 MatchCoreArena 的契约里声明。

## 错误码

错误码是稳定的 `lower_snake_case` 字符串。注册表在 `docs/api/error-codes.md`，目前收录 96 条，从解析层面的 `invalid_json_body` 到 MatchCoreArena 的 `mca_` 前缀错误码。

新增错误码时，步骤顺序是固定的。

1. 在 `docs/api/error-codes.md` 登记
2. 在该服务的 OpenAPI 规范里声明
3. 在服务里实现

没有进注册表的错误码就不算契约，即使服务已经返回了它。

## 鉴权级别

HA 业务接口一共定义三级凭据。

| 级别 | 含义 | 可接受的凭据 |
|---|---|---|
| `0` | 无 | 不需要凭据 |
| `1` | 用户 | OAuth2 用户 Bearer Token |
| `2` | 运维 | Manage Token（M-T）或 OAuth2 服务令牌（`client_credentials` / `.as-service` scope） |

解析顺序是固定的。

- 没有 `Authorization: Bearer` 头：级别 `0`
- 令牌等于 Manage Token：级别 `2`
- 令牌能解析为 OAuth2 令牌：服务令牌为 `2`，其余为 `1`
- 令牌无法解析：级别 `0`

一个请求里有多个服务参与时，所需级别取它们 `security_level` 的最大值，在请求时动态计算，最严格的那个服务说了算。

失败按级别区分，而不是笼统地报未授权。

- 完全没有凭据：`401 oauth_login_required`
- 有凭据但强度不够：`403 insufficient_auth_level`

新增接口时，声明它需要的级别，并写进 OpenAPI 规范。

## OpenAPI 契约

| 文件 | 服务 | 范围 |
|---|---|---|
| `docs/api/openapi/hrpauth-business.yaml` | HRPAuth | 核心业务接口：OAuth2、账号、TOTP、WebAuthn、纹理、SDK 包管理 |
| `docs/api/openapi/hrpauth-yggdrasil-business.yaml` | HRPAuth-Yggdrasil-API | Yggdrasil 协议外围的业务包装层：纹理、游戏账号、Mojang 代理 |
| `docs/api/openapi/matchcorearena-business.yaml` | MatchCoreArena | 竞技场业务接口：鉴权、好友、队伍、对局、排行榜 |

三份都是 OpenAPI 3.1。

还有两个服务缺契约。HASkinLib 与 HASkinProxy 在 `docs/api/openapi/` 下没有 OpenAPI 文件，它们的接口文档暂时仍放在各自的服务仓库里。

Yggdrasil 协议面不属于 `hrpauth-business.yaml`。那个文件只覆盖 HRPAuth 核心业务接口，协议面记录在 `docs/dev/HRPAuth/yggdrasil-api.md`。

## 运行漂移检查

提交任何触及业务路由的改动之前，先跑检查。

```bash
./scripts/check-business-api-drift.sh
```

它从服务源码里提取路由列表，归一化路径参数，然后双向报告所有没有出现在 OpenAPI 路径清单里的路由。覆盖范围为 HRPAuth 核心对 `hrpauth-business.yaml`、HASkinLib 对 `haskinlib-business.yaml`、HRPAuth-Yggdrasil-API 对 `hrpauth-yggdrasil-business.yaml`。实现仓库通过 `HRPAUTH_REPO_DIR` / `HASKINLIB_REPO_DIR` / `YGGDRASIL_REPO_DIR` 环境变量定位，找不到时依次回退到契约仓库的同级目录与 `~/Desktop/HA`；仓库或契约文件缺失会直接报错，而不是悄悄通过。脚本在当前拆分布局下可以通过。

脚本依赖 `rg`（ripgrep）和 Bash。

另一个脚本职责不同，同样可以通过。

```bash
./scripts/check-readme-links.sh
```

它拒绝那些被作为独立仓库发布的子目录 README 中的 `](../` 相对链接。契约仓库里没有这类子目录，所以脚本通过且没有可检查的内容。

## 相关页面

- [概览](/zh/projects/ha-contract/)
- [文档体系结构](/zh/projects/ha-contract/documentation-layout)
- [HRPAuth](/zh/projects/hrpauth/)：业务路由遵循这份契约的服务
- [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)：第二份 OpenAPI 文件描述的业务包装层
