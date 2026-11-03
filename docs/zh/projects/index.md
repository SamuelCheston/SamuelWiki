# 项目

这一部分收录 HA 生态中的全部项目。每个页面都会说明这个项目负责什么、代码是怎么组织的，以及如何把它跑起来。

## 包含内容

- **认证与契约**：认证核心、Yggdrasil API、Web 界面以及皮肤相关服务
- **服务编排**：负责部署和运维整套服务的工具
- **对战竞技**：竞技场服务端、配套客户端以及 Bedwars 插件
- **客户端与工具**：桌面客户端和独立工具

## 认证与契约

- [HA-Contract](/zh/projects/ha-contract/)：API 契约、错误码与规范的单一事实源。
- [HRPAuth](/zh/projects/hrpauth/)：提供 OAuth2 与 Yggdrasil-API 的核心验证服务。
- [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)：独立的 Yggdrasil API 提供者，并负责游戏账号管理。
- [HRPAuth Web](/zh/projects/hrpauth-web/)：身份验证服务的前端单页应用。
- [HRPAuth Spigot](/zh/projects/hrpauth-spigot/)：把整套服务接入代理的 Minecraft 服务端插件。
- [HASkinLib](/zh/projects/haskinlib/)：存放并分发玩家材质的公共皮肤库。
- [HASkinProxy](/zh/projects/haskinproxy/)：把 Yggdrasil 调用翻译成 CustomSkinLoader 格式的兼容代理。
- [WinnerProxy](/zh/projects/winnerproxy/)：为正版玩家保留稳定 UUID 的加入代理。

## 服务编排

- [HA 服务部署器](/zh/projects/ha-services-deployer/)：用一份配置部署整套服务。
- [HA 服务运维视图](/zh/projects/ha-services-maintenanceview/)：面向运行中服务的运维面板。
- [HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/)：收集卫星 SDK 包并注入 WebUI 构建。

## 对战竞技

- [MatchCoreArena 服务端](/zh/projects/matchcorearena-server/)：负责竞技场匹配与计分的服务端权威实现。
- [MatchCoreArena 客户端](/zh/projects/matchcorearena-client/)：竞技场服务的配套客户端与大厅。
- [MatchCoreArena 运维视图](/zh/projects/matchcorearena-maintenanceview/)：竞技场运维用的桌面面板。
- [BedwarsRel](/zh/projects/bedwarsrel/)：支持多版本服务端的对战匹配插件。
- [BedwarsRel MCA](/zh/projects/bedwarsrel-mca/)：为接入 MatchCoreArena 而打造的 BedwarsRel 变体。

## 客户端与工具

- [SamuelClient](/zh/projects/samuelclient/)：用于管理个人账号的桌面客户端。
- [BS2HA](/zh/projects/bs2ha/)：把 Blessing-Skin-Server 数据一次性迁移进 HRPAuth 的离线命令行工具。

## 适合什么时候看

- 第一次接手某个项目的时候
- 需要判断某个职责归属哪个服务的时候
- 修改接口、需要确认谁在消费它的时候

## 相关页面

- [开始使用](/zh/guide/)：整套服务在运行时是怎么串起来的
- [配置文件使用指南](/zh/guide/how-to-use-conf-file)：每个核心服务的配置文件
- [API 规范](/zh/projects/ha-contract/api-standards)：所有业务接口都必须遵守的契约
