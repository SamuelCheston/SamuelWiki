# HA-Contract

HA-Contract 是 CoreMatch HA 体系的契约与文档中心。它存放 API 规范、OpenAPI 定义、开发指南、外部协议参考资料和 CI 辅助脚本，不含任何服务实现代码。

它服务于**二次开发**：其中的每一份内容都是为了让其他服务、客户端与集成能够基于稳定契约进行开发。部署与运维相关文档归入本站 Wiki，而不是契约仓库。

## 覆盖范围

- 统一的业务接口规范：响应封装、错误码、base path、分页
- 面向 HRPAuth、HRPAuth-Yggdrasil-API、MatchCoreArena、HASkinLib 与 Cascade 后端的机器可读 OpenAPI 3 契约
- 所有业务接口共用的全局错误码注册表
- 面向 HRPAuth、HRPAuth-Yggdrasil-API、HASkinProxy、HA 服务部署器、WinnerProxy 与 Cascade 的开发指南
- CustomSkinAPI、authlib-injector 等外部协议标准的只读副本
- 检查路由漂移与非法相对链接的 CI 辅助脚本

## 技术栈

- 文档一律用 Markdown
- OpenAPI 3.1 契约用 YAML
- 校验脚本用 Bash，唯一外部依赖是 `rg`（ripgrep）

没有编译步骤，也没有运行时依赖。这个仓库只被读取、编辑和校验。

## 目录结构

```text
README.md          # 项目索引，指向各个服务仓库
agents.md          # AI 代理在本仓库工作时的强制规则
docs/              # 全部现行文档
docs/api/          # API 规范、统一响应格式、错误码注册表
docs/api/openapi/  # 按服务拆分的机器可读 OpenAPI 契约
docs/dev/          # 按服务拆分的开发指南
docs/references/   # 外部协议标准，只读
archive/docs/      # 已废弃或漂移的文档，不作为参考
scripts/           # CI 辅助脚本
```

## 运行方式

### 运行前准备

- Bash
- `rg`（ripgrep），两个校验脚本都要用
- 如果你希望漂移检查能比对真实路由，还需要把各个服务仓库放在同一台机器上

### 校验脚本

```bash
./scripts/check-business-api-drift.sh
./scripts/check-readme-links.sh
```

`check-readme-links.sh` 会拒绝那些被作为独立仓库发布的子目录 README 中的 `](../` 链接。契约仓库里没有这类子目录，所以脚本通过且没有可检查的内容。

`check-business-api-drift.sh` 会从服务源码里提取路由，再与 OpenAPI 文件的路径清单做双向比对。它覆盖 HRPAuth 核心对 `hrpauth-business.yaml`、HASkinLib 对 `haskinlib-business.yaml`、HRPAuth-Yggdrasil-API 对 `hrpauth-yggdrasil-business.yaml`。实现仓库通过 `HRPAUTH_REPO_DIR` / `HASKINLIB_REPO_DIR` / `YGGDRASIL_REPO_DIR` 环境变量定位，找不到时依次回退到契约仓库的同级目录与 `~/Desktop/HA`；仓库或契约文件缺失会直接报错，而不是悄悄通过。脚本在当前拆分布局下可以通过。

### 使用方式

先读 `docs/api/README.md`，再读你要改动的服务对应的 OpenAPI 文件。新增业务路由时，先在 OpenAPI 里声明，再到 `docs/api/error-codes.md` 登记错误码，最后在服务里实现。契约是事实源，代码要匹配规范，而不是反过来。

## 配置

没有运行期配置。这个仓库没有可启动的东西，也没有需要调整的参数。

约束它的规则写在四个地方。

- `agents.md`：代理强制规则、服务清单、路线图与任务检查清单
- `docs/api/README.md`：统一响应格式与外部协议合规清单
- `docs/api/error-codes.md`：新增错误码必须登记的注册表
- `docs/references/README.md`：外部标准的只读约定

文档强制使用英文。`docs/references/` 严禁修改，`archive/docs/` 不得作为开发参考。

## 与其它项目的关系

- **是唯一事实源**，API 契约、错误码和规范都在这里，各个服务仓库的 README 都指回这里
- **定义业务接口**，[HRPAuth](/zh/projects/hrpauth/)、[HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)、[MatchCoreArena 服务端](/zh/projects/matchcorearena-server/) 与 [HASkinLib](/zh/projects/haskinlib/) 都按它实现
- **将要定义业务接口**，[HASkinProxy](/zh/projects/haskinproxy/) 的规范仍在待办中，当前的接口文档还放在服务仓库里。[WinnerProxy](/zh/projects/winnerproxy/) 也没有 OpenAPI 文件，其接口面以开发契约表格的形式记录在 `docs/dev/WinnerProxy/README.md`
- **改动 HRPAuth 模型前必须先看这里**，因为 [HASkinLib](/zh/projects/haskinlib/) 共用同一个 MySQL，库表变更会直接把它弄坏
- **被代理与 CI 消费**，这也是校验脚本和 `agents.md` 放在仓库里而不是放在 wiki 里的原因

## 相关页面

- [文档体系结构](/zh/projects/ha-contract/documentation-layout)：`docs/` 各子目录放什么，哪些规则是硬边界
- [API 规范](/zh/projects/ha-contract/api-standards)：响应格式、错误码、鉴权级别与漂移检查
- [HRPAuth](/zh/projects/hrpauth/)：实现核心业务接口的服务
- [内容模型](/zh/reference/content-model)：本站页面如何组织
