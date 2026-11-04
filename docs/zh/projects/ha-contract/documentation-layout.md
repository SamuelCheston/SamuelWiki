# 文档体系结构

HA-Contract 把四类文档分开存放，这份分离是靠规则约束的，不是靠约定。本页说明每个目录放什么，以及哪些边界不能越。

## 两个文档仓库

HA 体系的文档按受众统一收口在两个地方。

- `HA-Contract/docs/`：权威契约源，也是 AI 代理应当读取的地方
- 本 Wiki（`wiki.mcnb.dev`，仓库 `SamuelCheston/SamuelWiki`）：面向人类的文档的唯一收口，包括部署与运维内容

`CoreMatch/HRPAuth-Wiki` 不再是独立内容仓库，其内容已冻结并并入本 Wiki。契约相关的工作属于 `HA-Contract`，部署与运维文档属于本 Wiki——服务仓库两者都不保留。

## `docs/api/`

API 规范本身。它回答的问题是"业务响应的形状必须是什么"。

- `README.md`：统一响应格式、外部协议合规清单、文件索引
- `error-codes.md`：全局错误码注册表

`README.md` 同时划出了两类文档的界线：`docs/api/` 与 `docs/dev/` 描述项目如何实现这些接口，`docs/references/` 则是协议标准本身。

## `docs/api/openapi/`

机器可读的契约。每个文件描述一个服务的路径与响应结构。

- `hrpauth-business.yaml`：HRPAuth 核心业务接口
- `hrpauth-yggdrasil-business.yaml`：HRPAuth-Yggdrasil-API 的业务包装层
- `matchcorearena-business.yaml`：MatchCoreArena 服务端业务接口
- `haskinlib-business.yaml`：HASkinLib 业务接口
- `cascade-backend-v1.yaml`：Cascade 后端 v1 接口

还有两个服务尚未覆盖。HASkinProxy 在这个目录下没有 OpenAPI 文件，它当前的接口文档仍放在服务仓库里。WinnerProxy 也没有 OpenAPI 文件：它的入站与出站面以表格形式记录在 `docs/dev/WinnerProxy/README.md`，因为其主体就是标准 Yggdrasil 协议。

Yggdrasil 协议面刻意不放进 `hrpauth-business.yaml`。它单独记录在 `docs/dev/HRPAuth/yggdrasil-api.md`，OpenAPI 文件里只有围绕它的业务包装层。

## `docs/dev/`

各个服务的开发指南，解释实现细节：数据模型、令牌、功能开关与集成契约。

- `HRPAuth/`：数据模型、令牌体系、功能开关、微服务扩展层、SDK 包契约、profile keys、旧皮肤接口、BS2HA 迁移、Yggdrasil 协议面
- `HRPAuth-Yggdrasil-API/`：独立 Yggdrasil 服务的交互契约
- `HASkinProxy/`：Yggdrasil 到 CSL 的转换代理如何工作
- `HA-Services-Deployer/`：版本清单格式
- `WinnerProxy/`：WinnerProxy 服务契约（入站路由、出站调用、配置说明）
- `Cascade/`：Cascade 后端契约

HRPAuth 的配置与数据库迁移指南过去也放在这里，现已移出契约仓库，改由本 Wiki 的[配置与接口](/zh/projects/hrpauth/configuration)与[数据库迁移](/zh/projects/hrpauth/database-migrations)页维护；旧副本保留在 `archive/docs/HRPAuth/`。

## `docs/references/`

外部协议标准，也是仓库里唯一只读的内容。

- `CustomSkinAPI.md`：皮肤库标准
- `authlib-injectorwiki.pdf`：authlib-injector 与 Yggdrasil API 协议参考

这些文件是其它项目拥有的协议的权威定义。合规原则是单向的：实现必须服从它们，文档本身绝不允许为了迁就实现而修改。

## `archive/docs/`

已废弃或漂移的文档，只作历史留存。

- `HRPAuth/`：旧的按接口拆分的文档、旧的配置与数据模型说明
- `HASkinLib/`：旧的皮肤库接口说明
- `WinnerProxy/`：旧的根 README

关于这个目录有两点要知道。它不能作为开发参考，其中的内容也已经和当前实现产生漂移。部分归档文档还是中文写的，现行的英文强制规则并没有覆盖它们。

## `agents.md`

在本仓库工作的 AI 代理的规则文件，也是每个代理开工前应当先读的文件。

- 服务清单：生态里每个服务的仓库、职责与技术栈
- 强制规则：唯一事实源、参考资料只读、归档禁用、文档强制英文、漂移检查
- 文档收口规则：任何服务仓库都不保留自己的契约或开发文档；契约统一收口 HA-Contract，面向人类的文档统一收口本 Wiki
- 子项目耦合说明，其中包括 HRPAuth 与 HASkinLib 共用的 MySQL 数据库
- 路线图表，代理只有在征得所有者同意后才能扩充
- 每个代理都必须走过的任务检查清单

这个文件同时指向本 Wiki（`wiki.mcnb.dev`）作为面向人类的文档收口，让代理清楚哪类内容该放哪里。

## `scripts/`

两个 CI 辅助脚本，它们组成的门禁。

- `check-business-api-drift.sh`：把从服务源码里提取的路由与 OpenAPI 中声明的路径做比对，从而抓出"代码里加了、文档里没写"的路由
- `check-readme-links.sh`：拒绝那些被作为独立仓库发布的子目录 README 中的 `](../` 相对链接，因为目录一旦拆出去，相对链接就会失效

两个脚本都需要 `rg`。漂移脚本把 HRPAuth 核心、HASkinLib 与 HRPAuth-Yggdrasil-API 三个仓库同 `hrpauth-business.yaml`、`haskinlib-business.yaml`、`hrpauth-yggdrasil-business.yaml` 做比对。它通过 `HRPAUTH_REPO_DIR` / `HASKINLIB_REPO_DIR` / `YGGDRASIL_REPO_DIR` 环境变量定位实现仓库，找不到时依次回退到契约仓库的同级目录与 `~/Desktop/HA`；仓库或契约文件缺失会直接报错。脚本在当前拆分布局下可以通过。

## 改动该落到哪里

- 新增业务路由：该服务对应的 OpenAPI 文件
- 新增错误码：`docs/api/error-codes.md`，且要早于代码实现
- 服务行为变化：对应的 `docs/dev/` 指南
- 协议层面的疑问：`docs/references/`，只读
- 适用于所有代理的规则：`agents.md`

## 相关页面

- [概览](/zh/projects/ha-contract/)
- [API 规范](/zh/projects/ha-contract/api-standards)
- [文档编写规范](/zh/reference/writing-docs)：本站遵循的写作规范
