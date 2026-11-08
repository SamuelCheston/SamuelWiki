# 零模组大厅与分流

指定一个后端作为大厅：任何客户端无论装没装模组都能进入；玩家从大厅浏览房间，经代理跳入各模组后端。本页解释大厅为什么可以零模组、多装/少装模组各意味着什么、子服为什么不需要暴露公网。

## 为什么零模组大厅行得通

引擎有两道互相独立的一致性门槛，只有一道与模组有关：

- **注册 checksum** —— 客户端注册时校验，只覆盖基础单位集；装了什么模组不会改变它。
- **自定义单位清单** —— 服务端在服务器信息包里下发自定义单位清单（名字 + 校验和），由客户端本地核对。缺模组或模组不一致会在这里失败，发生在进入大厅之前。

大厅后端的模组集为空，自定义单位清单因此为空，第二道门槛对任何客户端都平凡通过。任何客户端——没装模组、装了一些、装了任意模组——都能安全进入并停留。完整核查过程记录在 Avalon `knowledge/0009-zero-mod-lobby-and-mod-assembly.md`。

## 大厅模式做什么

`cascadeLobby: true` 的后端（`internal/data/bean/configs.go::CoreConfig`）会启动引擎、建好房间、开放游戏端口、允许玩家连入停留——但永不真正开局（`internal/game/seam.go::StartGame` 的大厅分支），并拒绝客户端的 `/start` 命令（`internal/command/clientcommands.go::RegisterClientCommands`）。在 Cascade 侧，大厅被配置为默认后端，新连接一律落在大厅。

模组房同样以大厅模式运行：启动时只建房不开局，玩家进入之后才开局。这是所有后端的部署形态；结论与原因见 Avalon `docs/OPERATIONS.md`。

## 多装与少装

- **多装模组不影响任何事。** 注册不看模组，大厅的空自定义单位清单接纳所有人。
- **少装才是真正的门槛**：客户端缺某个必需模组时，连接模组房会在自定义单位核对处失败。这正是装配器要在连接发生之前解决的问题——见[模组装配](/zh/game/mod-assembly)。
- 装配时注入器按房间模组集精确匹配：启用房间要求的模组，其余模组在该会话中禁用。不删除任何文件。

## 路由：从大厅到子服

1. 玩家在大厅聊天框输入 `/goto <房间码>`。这是 Cascade 代理的命令，不是 Avalon 的命令。
2. Cascade 把房间码解析到所属后端（`internal/proxy/session.go::commandGoto`）。
3. Cascade 回一个重连包，目标是 `PublicGameHost:<jump_port>`——**代理自己的**跳转监听端口，从不是后端的真实地址。
4. 客户端重连到跳转端口；跳转监听器把这条连接直通到对应后端（`internal/proxy/server.go::Run`）。

由此得到：

- **子服不暴露公网。** 后端游戏口只需对 Cascade 可达；任何报文里的跳转目标恒为代理入口。后端在 Cascade 配置里声明 `jump_port`（`internal/config/config.go::BackendConfig`），代理为每个这样的后端多开一个公网监听端口。
- `PublicGameHost` 留空 = 禁用跳转（`/goto` 回复跳转未启用）。
- 玩家浏览的房间目录来自 Cascade 对各后端控制面的快照，持续刷新。

## 给自动化的启动窗口提示

Cascade 要求连续两次探测成功才把后端判为健康，而房间快照一次成功就对外可见。后端刚启动时存在"房间已可见、后端还未健康"的窗口；只等房间出现就放客户端进来的自动化会被 "No available backend" 踢回。门控要等后端健康，而不是等房间出现。

## 相关

- [模组装配](/zh/game/mod-assembly)：大厅与模组房之间发生的事
- [回归脚本](/zh/game/regression)：大厅 → 装配 → 跳转链路的真环境测试
- Avalon `docs/OPERATIONS.md`：大厅与路由的配置细节
- Cascade `knowledge/`：代理设计记录，含跳转路由
