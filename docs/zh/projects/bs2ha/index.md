# BS2HA

BS2HA 是一次性离线迁移 CLI。它把 Blessing-Skin-Server 的 SQL dump 与材质目录转换成可导入 HRPAuth Core 与 HRPAuth Yggdrasil 的 SQL 文件，并附带一份迁移报告。

## 覆盖范围

- 用自研解析器解析 BlessingSkin 的 SQL dump，不涉及任何数据库驱动
- 把用户、玩家与材质映射到 HA 的数据模型
- 从 dump 中探测密码方式，决定哪些用户必须重置密码
- 用 HRPAuth 私钥为 `textures` 资料属性签名
- 输出两份导入 SQL、一份 JSON 迁移报告与一份复制出来的材质目录
- 基线 SQL 内嵌在二进制里，工具可以零配置起步

## 技术栈

- Go 1.26，charmbracelet/huh 提供 TUI 表单，charmbracelet/lipgloss 负责样式
- 自研 SQL dump 解析器，无数据库驱动、无网络访问、无 HTTP 服务
- 基线 SQL 通过 `go:embed` 内嵌

## 目录结构

```text
cmd/bs2ha/main.go     # 唯一入口
internal/app/app.go   # 命令分发与 flag 解析
internal/bsdump/      # SQL dump 解析
internal/convert/     # 转换核心：表映射、密码方式探测、密钥生成、材质签名、报告生成
internal/tui/         # 交互向导
internal/assets/      # 内嵌基线 SQL
docs/design.md        # 迁移设计说明
```

## 运行方式

### 运行前准备

- Go 1.26
- 一个存放了 SQL dump 与材质目录的 Blessing-Skin-Server 目录
- 不需要其它任何东西，工具全程离线

### 构建

```bash
go build -o bs2ha ./cmd/bs2ha
```

### 运行

```bash
./bs2ha
```

请在 Blessing-Skin-Server 的根目录下执行。

缺少必要参数时它会打开 TUI 向导，向导会自动探测当前目录下的 `bs.sql`、材质目录与密钥文件。未提供私钥时，它会生成一个 RSA 4096 位私钥并写入 `hrpauth-generated.key`。

它没有端口，也不是常驻服务。Docker 镜像是一次性任务。

## 配置

没有 YAML 配置文件，全部通过命令行参数传入。

- `--bs-sql`（默认 `./bs.sql`）：BlessingSkin SQL dump 路径
- `--bs-textures`（默认 `storage/textures`）：材质目录路径，目录不存在时跳过材质迁移
- `--ha-callback-url`：HRPAuth 回调基地址，用于生成材质 URL
- `--ha-private-key` / `--ha-private-key-content`：HRPAuth Yggdrasil 签名私钥，可传文件路径或直接传 PEM 内容
- `--ha-gen-key-path`（默认 `hrpauth-generated.key`）：自动生成密钥的保存路径
- `--ha-baseline-sql` / `--ygg-baseline-sql`：基线模板文件，缺失时从内嵌资源中释放
- `--ha-out-sql` / `--ygg-out-sql`：两份导入 SQL 的输出路径
- `--out-report`：迁移报告的输出路径
- `--ha-textures-out`：材质输出目录
- `--bs-username-column`（默认 `nickname`）：BS `users` 表中的规范用户名列名
- `--unsigned`：没有私钥时允许生成未签名的材质属性

## 产物

- `ha-import.sql`：导入 HRPAuth Core 库的 `users` 数据
- `ygg-import.sql`：导入 Yggdrasil 库的 `accounts`、`profiles`、`profile_properties` 数据
- JSON 格式的迁移报告
- 复制出来的材质目录

## 迁移规则

- 密码方式从 SQL dump 中探测。`BCRYPT` 哈希直接透传，其它方式统一写成固定标记 `BS2HA$RESET_REQUIRED`，用户迁移后必须走密码重置流程。
- BS 的规范用户名取自 `users.nickname`，直接写入 HA 的 `users.username`。无法恢复用户名的用户会记入报告并按失败处理，工具不会自动造名。
- BS 的 `users.uid` 直接保留，HA 侧新生成 `users.uuid`。
- 迁移用户的默认值为：`cbh = 1`、`mbe = 0`、`regip = ip`、`mojang_uuid = NULL`、`totp = NULL`。
- 一个 BS 用户只有一个玩家时保留该玩家；有多个玩家时只保留名字等于 BS 用户名的那个；没有同名玩家时自动创建一个以 BS 用户名命名的补位角色，被丢弃的玩家会写进报告。
- BS 的材质哈希直接复用，材质文件被复制过去，`textures` 资料属性承载签名后的 Yggdrasil payload。
- 一期只迁移 `users`、`profiles` 与 `profile_properties`，不迁移 sessions、tokens 与 `oauth2_*`。
- `--unsigned` 只允许用于非生产导入。

## 与其它项目的关系

- **为** [HRPAuth](/zh/projects/hrpauth/) 与 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 提供数据，两份 SQL 需要分别导入两个数据库
- **与** HRPAuth 的微服务扩展层完全无关
- **是**这四个项目中唯一完全离线的项目，它不访问任何运行中的服务

## 相关页面

- [HRPAuth](/zh/projects/hrpauth/)：`users` 数据的导入目标 Core 库
- [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)：accounts、profiles 与 properties 的导入目标库
