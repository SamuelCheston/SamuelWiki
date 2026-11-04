# 数据库迁移

数据库 schema 由 SQL 迁移管理（`database/migrations/`，[golang-migrate](https://github.com/golang-migrate/migrate) 格式），迁移文件内嵌在二进制中。不使用 GORM 的 `AutoMigrate`。

## 启动行为

服务在数据库连接建立后自行执行迁移：

1. 使用 `config.yaml` 的 `database.*` 配置（含连接重试设置）打开数据库
2. 确保 `schema_migrations` 记账表存在
3. 执行内嵌迁移文件中所有尚未应用的步骤

数据库处于 dirty 状态时迁移步骤中止，启动日志会记一条 WARN，schema 保持落后，直到状态被修复并强制指定版本。没有可应用的迁移时该步骤是空操作。独立的 migrate CLI 已不存在，旧的 `cmd/migrate` 入口已被移除。当前版本状态存放在 `schema_migrations` 表中。

## 布局

- `000001_baseline` 是压缩后的核心 schema（`users`、`oauth2_clients`、`oauth2_authorization_codes`、`oauth2_access_tokens`、`oauth2_refresh_tokens`、`deleted_accounts`、`webauthn_credentials`）。历史步骤 `000002`–`000012` 已于 2026-10-14 压缩进 baseline（`b8a745c`）。Minecraft 专属表位于 HRPAuth-Yggdrasil-API（`000001_init`）。

## 规则

- 所有 schema 变更都通过 `database/migrations/` 落地。
- 修改 GORM 模型时，评估是否需要新增迁移。
- dirty 迁移状态需要手动解决（修复状态、强制指定版本），在此之前每次启动都会打警告。

## 相关页面

- [概览](/zh/projects/hrpauth/)
- [配置与接口](/zh/projects/hrpauth/configuration)
- [架构说明](/zh/projects/hrpauth/architecture)
