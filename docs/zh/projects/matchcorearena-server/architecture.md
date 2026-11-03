# 架构说明

服务是单个 Gin 进程：HTTP 层很薄，业务层持有全部 SQL，跨切面能力放在几个 internal 包里。评分结算是最值得细读的部分，因为用户的积分只会在那里发生变化。

## 分层职责

### HTTP 层

`api/router.go` 负责装配全部依赖并注册路由。只有这个文件知道完整的路由表。

- `api/handler/`：按领域拆分的处理器，`auth`、`user`、`friend`、`team`、`match`、`ranking`、`maintenance`
- `api/middleware/`：`request_id` 注入 `X-Request-Id` 头并写入上下文，`recovery` 捕获 panic，`auth` 校验 Bearer 令牌并把 `uid` 与 `scopes` 放入上下文

### 业务层

`internal/service/` 承载业务逻辑和所有 SQL 语句。处理器只做参数绑定与响应写出，服务层干活。

- `match.go` 是最关键的一个，它持有评分结算逻辑，并在单个事务里完成
- `ranking.go` 读取 `rankings` 表，在查询时实时计算名次
- `user.go`、`friend.go`、`team.go` 覆盖账号与社交功能
- `maintenance.go` 为运维通道执行原始语句

### internal 包

- `internal/response/`：统一信封，一个 `OK`、一个 `Created`、一个 `Fail`
- `internal/apperr/`：业务错误码与错误码到 HTTP 状态码的映射
- `internal/auth/`：HRPAuth 客户端、令牌校验器与服务凭据存储
- `internal/rating/`：Elo 算法，输出只由入参决定

## 统一响应信封

所有路由返回同一个结构。

```json
{
  "success": true,
  "message": "MatchCoreArena Server 运行中",
  "data": { "version": "1.4.0" },
  "meta": { "request_id": "0d1b5f2c-..." }
}
```

失败时结构会变，含义由状态码承载。

```json
{
  "success": false,
  "message": "用户不存在",
  "code": "mca_user_not_found",
  "error": "mca_user_not_found",
  "meta": { "request_id": "0d1b5f2c-..." }
}
```

`error` 是 `code` 的兼容别名，取值相同。`data` 为空时会被省略。`request_id` 来自 `request_id` 中间件，因此响应头与响应体始终一致。

### 错误码族

存在两族错误码，另外还有少量不带前缀的共享错误码。

- `oauth_*`：复用自 [HA-Contract](/zh/projects/ha-contract/api-standards)，例如 `oauth_login_required`、`oauth_insufficient_scope`、`oauth_invalid_grant`、`oauth_token_expired`、`oauth_refresh_failed`、`oauth_revoke_failed`、`oauth_rate_limited`、`oauth_hrpauth_down`
- `mca_*`：本服务自有错误码，例如 `mca_invalid_request`、`mca_user_not_found`、`mca_friend_not_found`、`mca_friend_request_exists`、`mca_team_not_found`、`mca_team_name_taken`、`mca_not_team_leader`、`mca_match_not_found`
- `invalid_request` 与 `internal_error`：不带族前缀的共享错误码

每个错误码对应固定的状态码。`oauth_hrpauth_down` 是 `502`，`oauth_insufficient_scope` 是 `403`，`mca_*` 的未找到类错误码是 `404`。未注册的错误码回落到 `500`。

## 评分结算

### 公式

```text
delta = K × (S − E) × W_round × W_streak × W_perf
```

`E` 是 Elo 公式给出的期望胜率，用队伍平均值而不是个人数值计算。

```text
E = 1 / (1 + 10 ^ ((R_opponent − R_player) / 400))
```

`S` 在胜者是 `1`，在每一支败队成员身上是 `0`。结果四舍五入到整数。

### 各项权重

`K` 是基础因子，取决于用户已经赢过多少场。

- 定级期，即前 10 胜：`K` 从 `520` 递减到 `390`
- 稳定期：`190`

`W_round` 来自获胜队的生存比例，即 `alive_count / initial_count`。

- 比例不超过 `0.25`：`1.00`
- 比例不超过 `0.5`：`1.05`
- 比例不超过 `0.75`：`1.15`
- 其余情况：`1.25`

`W_streak` 来自当前连胜或连败，正负号区分胜负。

- 连胜不超过 2：`1.00`
- 连胜 3 到 4：`1.15`
- 连胜 5 及以上：`1.28`
- 连败不超过 2：`1.00`
- 连败 3 到 4：`0.85`
- 连败 5 及以上：`0.73`

`W_perf` 是调用方上报的个人表现系数。它被夹紧到 `[0.95, 1.05]`，上报值为 `0` 时替换成 `1.0`。

### 落库内容

整个结算在单个事务中完成。

- `users.rank_score` 变为 `GREATEST(0, rank_score + delta)`，积分不会被压到负数
- 胜者还会执行 `wins_count = wins_count + 1`
- 往 `match_participants` 写一行，记录赛前积分与本局变动
- 按对局的排行类型往 `rankings` 写入或更新一行，赛季为 `1`

用于计算 `W_streak` 的连胜状态，取自该用户最近 10 场对局。

## 对局上报链路

调用方把 `TeamReportInput` 发到 `POST /api/matches`。

```json
{
  "match_type": "4v4v4v4",
  "winner_team": {
    "team_id": "red",
    "initial_count": 4,
    "alive_count": 2,
    "members": [
      { "uuid": "...", "survival_time": 300, "kills": 4, "deaths": 2, "perf_tweak": 1.0 }
    ]
  },
  "loser_teams": [],
  "duration_seconds": 420,
  "started_at": "2026-09-18T12:00:00Z",
  "finished_at": "2026-09-18T12:07:00Z"
}
```

服务随后按顺序完成这些工作。

1. 通过 HRPAuth 的 `POST /user/lookup-uuid` 把每个成员的 `uuid` 解析成 `uid`。映射结果在 Redis 中以 `mca:uuid_to_uid:<uuid>` 为键缓存 24 小时
2. 从 `users` 读取每位参与者当前的 `rank_score` 与 `wins_count`
3. 计算胜队平均分与败队平均分，再算出期望胜率
4. 用获胜队生存比例计算 `W_round`
5. 插入 `matches` 记录
6. 结算每位参与者，先处理胜者，再逐支处理败队
7. 提交事务

正常调用方是 [BedwarsRel-MCA](/zh/projects/bedwarsrel-mca/)。它在游戏结束时构造同样的载荷，在独立线程里异步发送，并使用 `match-reporter` 凭据。`match_type` 由队伍数量与每队人数拼出，例如 `4v4v4v4`，`perf_tweak` 恒为 `1.0`。

## 认证代理与运维通道

### 认证代理

MCA 不实现 OAuth2 流程，只做转发。

- `POST /api/auth/login-ticket` 转发到 HRPAuth `POST /oauth/login-ticket`，上游响应原样返回，由前端自行处理 `totp_required`
- `POST /api/auth/totp-verify` 转发到 HRPAuth `POST /totp/verify`
- `POST /api/auth/refresh` 转发到 HRPAuth `POST /oauth/token`，带上 `grant_type=refresh_token` 与配置的 `public_client_id`
- `POST /api/auth/logout` 转发到 HRPAuth `POST /oauth/revoke`，随后删除 Redis 中的校验缓存条目，让已吊销的令牌立刻失效

普通请求携带玩家 Bearer 令牌。校验器用它调用 HRPAuth `POST /user`，并把结果在 Redis 中以 `mca:token_verify:<token>` 为键缓存 5 分钟。运维令牌与 `config/tokens.yaml` 中的服务凭据在这条调用之前就会被比对，所以运维操作完全不触碰 HRPAuth。

### 运维通道

`POST /api/maintenance/sql` 需要 `maintenance` scope，请求体只有一个字段。

```json
{ "sql": "SELECT COUNT(*) FROM users" }
```

语句会先按查询尝试，失败后再按执行尝试。`SELECT` 返回按行组织的 map 列表，其它语句返回 `rows_affected` 与 `last_insert_id`。

## 已知不一致

- `migrate.RunMigrations` 只执行 `migrations/baseline.sql`。`migrations/20260918_add_match_participants.sql` 虽然被内嵌进二进制，但从不执行
- 因此 `match_participants` 从未被创建，上报链路写入 `matches` 的 `winner_team_id` 与 `survival_rate` 两列在只跑 baseline 的情况下并不存在。这两列只有 `20260918` 那个文件会添加
- 仓库没有 README

## 相关页面

- [概览](/zh/projects/matchcorearena-server/)
- [配置](/zh/projects/matchcorearena-server/configuration)
- [API 规范](/zh/projects/ha-contract/api-standards)：响应信封与错误码遵循的契约
