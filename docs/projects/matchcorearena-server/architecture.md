# Architecture

The service is a single Gin process with a thin HTTP layer, a service layer that owns the SQL, and a set of internal packages for the cross-cutting concerns. Rating settlement is the part worth reading carefully, because it is the only place where a user's score changes.

## Layered Responsibilities

### HTTP layer

`api/router.go` builds every dependency and registers the routes. It is the only file that knows the full route table.

- `api/handler/`: one handler per domain, `auth`, `user`, `friend`, `team`, `match`, `ranking`, `maintenance`
- `api/middleware/`: `request_id` injects an `X-Request-Id` header and stores it in the context, `recovery` catches panics, `auth` verifies the bearer token and puts `uid` and `scopes` into the context

### Service layer

`internal/service/` holds the business logic and every SQL statement. The handlers do binding and response writing, the services do the work.

- `match.go` is the interesting one, it owns the rating settlement and runs it inside one transaction
- `ranking.go` reads the `rankings` table and computes the position at query time
- `user.go`, `friend.go`, `team.go` cover the account and social features
- `maintenance.go` runs a raw statement for the operator channel

### Internal packages

- `internal/response/`: the unified envelope, one `OK`, one `Created`, one `Fail`
- `internal/apperr/`: the business error codes and the code to HTTP status mapping
- `internal/auth/`: the HRPAuth client, the token verifier and the service credential store
- `internal/rating/`: the Elo algorithm, a pure function of its inputs

## The Response Envelope

Every route answers with the same shape.

```json
{
  "success": true,
  "message": "MatchCoreArena Server 运行中",
  "data": { "version": "1.4.0" },
  "meta": { "request_id": "0d1b5f2c-..." }
}
```

On failure the shape changes and the status code carries the meaning.

```json
{
  "success": false,
  "message": "用户不存在",
  "code": "mca_user_not_found",
  "error": "mca_user_not_found",
  "meta": { "request_id": "0d1b5f2c-..." }
}
```

`error` repeats `code` as a compatibility alias. `data` is omitted when it is empty. `request_id` comes from the `request_id` middleware, so the header and the body always agree.

### Error code families

Two families exist, plus a few shared codes without a prefix.

- `oauth_*`: reused from [HA-Contract](/projects/ha-contract/api-standards), for example `oauth_login_required`, `oauth_insufficient_scope`, `oauth_invalid_grant`, `oauth_token_expired`, `oauth_refresh_failed`, `oauth_revoke_failed`, `oauth_rate_limited`, `oauth_hrpauth_down`
- `mca_*`: this service's own codes, for example `mca_invalid_request`, `mca_user_not_found`, `mca_friend_not_found`, `mca_friend_request_exists`, `mca_team_not_found`, `mca_team_name_taken`, `mca_not_team_leader`, `mca_match_not_found`
- `invalid_request` and `internal_error`: shared codes without a family prefix

Each code has a fixed HTTP status. `oauth_hrpauth_down` is `502`, `oauth_insufficient_scope` is `403`, the `mca_*` not found codes are `404`. A code that is not registered falls back to `500`.

## The Rating Settlement

### The formula

```text
delta = K × (S − E) × W_round × W_streak × W_perf
```

`E` is the expected win rate from the Elo formula, computed on team averages rather than on individuals.

```text
E = 1 / (1 + 10 ^ ((R_opponent − R_player) / 400))
```

`S` is `1` for the winner and `0` for every member of a losing team. The result is rounded to an integer.

### The weights

`K` is the base factor and depends on how many wins the user already has.

- placement phase, the first 10 wins: `K` goes from `520` down to `390`
- stability phase: `190`

`W_round` comes from the survival ratio of the winning team, `alive_count / initial_count`.

- ratio at most `0.25`: `1.00`
- ratio at most `0.5`: `1.05`
- ratio at most `0.75`: `1.15`
- anything above: `1.25`

`W_streak` comes from the current streak. The sign tells wins from losses.

- winning streak of 2 or less: `1.00`
- winning streak of 3 to 4: `1.15`
- winning streak of 5 or more: `1.28`
- losing streak of 2 or less: `1.00`
- losing streak of 3 to 4: `0.85`
- losing streak of 5 or more: `0.73`

`W_perf` is the individual performance factor reported by the caller. It is clamped to the range `[0.95, 1.05]`, and a value of zero is replaced by `1.0`.

### What is written

The whole settlement runs inside one transaction.

- `users.rank_score` becomes `GREATEST(0, rank_score + delta)`, so a score never goes below zero
- the winners also get `wins_count = wins_count + 1`
- a row is written to `match_participants` with the score before the match and the delta
- a row is upserted into `rankings` for the rank type of the match, in season `1`

The streak that feeds `W_streak` is read from the last 10 matches of the user.

## The Match Reporting Path

The caller posts a `TeamReportInput` to `POST /api/matches`.

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

The service then does the following, in order.

1. Resolves every member `uuid` to a `uid` through the HRPAuth `POST /user/lookup-uuid` endpoint. The mapping is cached in Redis under `mca:uuid_to_uid:<uuid>` for 24 hours
2. Reads the current `rank_score` and `wins_count` of each participant from `users`
3. Computes the average rating of the winning team and of the losing teams, then the expected win rate
4. Computes `W_round` from the winning team survival ratio
5. Inserts the `matches` row
6. Settles every participant, winners first, then each losing team
7. Commits

[BedwarsRel-MCA](/projects/bedwarsrel-mca/) is the normal caller. It builds the same payload at the end of a game, sends it asynchronously on a separate thread, and uses the `match-reporter` credential. It derives `match_type` from the team count and the player count per team, for example `4v4v4v4`, and always reports `perf_tweak` as `1.0`.

## The Auth Proxy and the Maintenance Channel

### The auth proxy

MCA does not implement the OAuth2 flow, it forwards it.

- `POST /api/auth/login-ticket` becomes HRPAuth `POST /oauth/login-ticket`, and the upstream response is passed through unchanged so the frontend can handle `totp_required` itself
- `POST /api/auth/totp-verify` becomes HRPAuth `POST /totp/verify`
- `POST /api/auth/refresh` becomes HRPAuth `POST /oauth/token` with `grant_type=refresh_token` and the configured `public_client_id`
- `POST /api/auth/logout` becomes HRPAuth `POST /oauth/revoke`, and the Redis verification cache entry is deleted afterwards so a revoked token fails immediately

A normal request carries a player bearer token. The verifier calls HRPAuth `POST /user` with it and caches the result in Redis under `mca:token_verify:<token>` for 5 minutes. The maintenance token and the service credentials in `config/tokens.yaml` are checked before that call, so an operator never touches HRPAuth.

### The maintenance channel

`POST /api/maintenance/sql` needs the `maintenance` scope. The body is a single field.

```json
{ "sql": "SELECT COUNT(*) FROM users" }
```

The statement is first tried as a query. If that fails it is retried as an exec, so a `SELECT` returns the rows as a list of maps and any other statement returns `rows_affected` and `last_insert_id`.

## Known Inconsistencies

- `migrate.RunMigrations` only executes `migrations/baseline.sql`. The `migrations/20260918_add_match_participants.sql` file is embedded into the binary but never run
- As a consequence `match_participants` is never created, and the `winner_team_id` and `survival_rate` columns that the reporting path writes into `matches` do not exist after a plain baseline. The `20260918` file is the only place that adds them
- The repository has no README

## Related Pages

- [Overview](/projects/matchcorearena-server/)
- [Configuration](/projects/matchcorearena-server/configuration)
- [API Standards](/projects/ha-contract/api-standards): the contract the response envelope and the error codes follow
