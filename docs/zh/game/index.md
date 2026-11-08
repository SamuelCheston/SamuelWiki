# 游戏服务

本分区记录生态中 Rusted Warfare 游戏服务栈的现状：玩家如何进入模组房、代理如何分流、插件如何扩展服务器，以及整套服务如何部署与运维。

## 这套栈里有什么

- **Avalon** —— 单房间游戏服务器。每个 Avalon 实例运行一个房间，由自己的游戏引擎 helper 进程承载。
- **Cascade** —— 面向公网的代理。玩家只连接 Cascade 一次；它负责把玩家路由到后端、提供房间目录、处理跳服。
- **RW-Mod-Injector** —— 注入游戏客户端的装配器。在玩家进入房间之前，拉取并安装该房间所需的模组。
- **HA Services Deployer** —— 版本清单、产物分发，以及可选启用的部署编排。
- **HA Services MaintenanceView** —— 浏览器运维面板。
- **Tinyvisor** —— 保活服务进程的进程监督器；部署时由 Deployer 驱动。

## 一局游戏如何串起来

1. 客户端连接 Cascade 代理，进入零模组大厅。
2. 玩家浏览房间目录，选择一个模组房间。
3. 装配器拉取该房间的模组清单，下载并校验缺失的模组，装配生效后重连回大厅。
4. 玩家输入 `/goto <房间码>`；Cascade 把客户端指向自己的跳转端口，落到目标后端。
5. 对局结束后，`/inj restore` 把客户端还原到进房前的模组状态。

## 阅读路径

- **玩家**：[模组装配](/zh/game/mod-assembly) 说明要输入什么命令、每条失败提示是什么意思；[零模组大厅与分流](/zh/game/lobby-and-routing) 说明大厅与 `/goto`。
- **维护者**：[部署编排](/zh/game/deployment)、[运维面板](/zh/game/operations-panel)、[回归脚本](/zh/game/regression)。[零模组大厅与分流](/zh/game/lobby-and-routing) 里的大厅拓扑同样与部署相关。
- **插件作者**：[插件三档](/zh/game/plugins) 概述模型；完整开发者文档在 Avalon 仓库的 `docs/plugins/`。

## 细节在哪里

本分区只记录生态层面的现状。各仓库的细节——配置键、协议字段、决策历史——在各仓的 `docs/` 与 `knowledge/` 目录以及 HA-Contract 中。本页与这些来源不一致时，以仓库来源为准。

## 相关

- [HA 服务部署器](/zh/projects/ha-services-deployer/)：部署后端的项目页
- [HA 服务运维视图](/zh/projects/ha-services-maintenanceview/)：运维面板的项目页
- [容器编排](/zh/projects/ha-services-deployer/container-orchestration)：认证栈的 Compose 模板
