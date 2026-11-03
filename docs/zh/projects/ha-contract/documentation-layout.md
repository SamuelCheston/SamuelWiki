# 文档体系结构

HA-Contract 把四类文档分开存放，这份分离是靠规则约束的，不是靠约定。本页说明每个目录放什么，以及哪些边界不能越。

## 两个文档仓库

HA 体系的文档放在两个互不相干的地方。

- `HA-Contract/docs/`：权威契约源，也是 AI 代理应当读取的地方
- `CoreMatch/HRPAuth-Wiki`：面向人类开发者的独立内容仓库

契约相关的工作属于 `HA-Contract`。不要在契约工作中修改 wiki 仓库。

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

有两个服务尚未覆盖。HASkinLib 与 HASkinProxy 在这个目录下没有 OpenAPI 文件，它们当前的接口文档仍放在各自的服务仓库里。

Yggdrasil 协议面刻意不放进 `hrpauth-business.yaml`。它单独记录在 `docs/dev/HRPAuth/yggdrasil-api.md`，OpenAPI 文件里只有围绕它的业务包装层。

## `docs/dev/`

各个服务的开发指南，解释实现细节：配置、数据模型、迁移、令牌、功能开关与集成契约。

- `HRPAuth/`：配置、数据模型、数据库迁移、令牌体系、功能开关、微服务扩展层、SDK 包契约、profile keys、旧皮肤接口、BS2HA 迁移
- `HRPAuth-Yggdrasil-API/`：独立 Yggdrasil 服务的交互契约
- `HASkinProxy/`：Yggdrasil 到 CSL 的转换代理如何工作
- `HA-Services-Deployer/`：版本清单格式

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
- 子项目耦合说明，其中包括 HRPAuth 与 HASkinLib 共用的 MySQL 数据库
- 路线图表，代理只有在征得所有者同意后才能扩充
- 每个代理都必须走过的任务检查清单

这个文件同时指向另一个面向人类的文档仓库，让代理清楚自己被允许改哪一边。

## `scripts/`

两个 CI 辅助脚本，它们组成的门禁。

- `check-business-api-drift.sh`：把从服务源码里提取的路由与 OpenAPI 中声明的路径做比对，从而抓出"代码里加了、文档里没写"的路由
- `check-readme-links.sh`：拒绝那些被作为独立仓库发布的子目录 README 中的 `](../` 相对链接，因为目录一旦拆出去，相对链接就会失效

两个脚本都需要 `rg`。漂移脚本目前会因为[概览](/zh/projects/ha-contract/)页里说的原因失败：它仍指向已移除的单体仓库布局，以及一个并不存在的 OpenAPI 文件。

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
