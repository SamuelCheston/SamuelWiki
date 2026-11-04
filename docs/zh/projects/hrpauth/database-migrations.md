# 数据库迁移

数据库 schema 由 SQL 迁移管理（`database/migrations/`，[golang-migrate](https://github.com/golang-migrate/migrate) 格式）；启动时**不**执行 `AutoMigrate`。

## 布局与入口

- 入口：在仓库根目录执行 `go run ./cmd/migrate ...`（复用 `config.yaml` 的 `database.*` 配置）。
- `000001_baseline` 是压缩后的核心 schema（`users`、`oauth2_clients`、`oauth2_authorization_codes`、`oauth2_access_tokens`、`oauth2_refresh_tokens`、`deleted_accounts`、`webauthn_credentials`）。历史步骤 `000002`–`000012` 已于 2026-10-14（`b8a745c`）压缩进该 baseline。Minecraft 专属表位于 HRPAuth-Yggdrasil-API（`000001_init`）。

## 命令

```bash
go run ./cmd/migrate version   # 当前迁移版本与 dirty 状态
go run ./cmd/migrate status    # 同 version
go run ./cmd/migrate up        # 应用全部未执行的迁移
go run ./cmd/migrate up 1      # 只前进 N 步
go run ./cmd/migrate down      # 回滚 1 步（down N 回滚 N 步）
go run ./cmd/migrate force 1   # 不执行 SQL，直接标记版本
```

全新数据库：执行 `go run ./cmd/migrate up`，再用 `status` 验证。

## 规则

- 应用启动不修改表结构；数据库初始化只建立连接。
- 所有 schema 变更必须经由 `database/migrations/` 落地。
- 修改 GORM 模型时，同步评估是否需要新增迁移。

## 相关页面

- [概览](/zh/projects/hrpauth/)
- [配置与接口](/zh/projects/hrpauth/configuration)
- [架构说明](/zh/projects/hrpauth/architecture)
