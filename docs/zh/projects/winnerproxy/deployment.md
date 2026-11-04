# 部署

WinnerProxy 的生产运行方式：二进制布局、进程守护、容器部署与联调检查。

## 运行前准备

- 一个运行中的 HRPAuth 核心，且 HRPAuth Yggdrasil API 服务已注册在它的 `/yggdrasil-api` relay 之后
- 核心上供 WinnerProxy 使用的 OAuth2 客户端（`client_credentials` 授权）
- 到 `sessionserver.mojang.com` 与 `api.minecraftservices.com` 的出站 HTTPS，除非关闭 Mojang 回退
- 二进制在可执行文件同目录读写 `config.yml`，首次启动时该目录必须可写

## 单实例设计

WinnerProxy 是单实例设计：进程内 freecache、无共享状态、无 leader 选举。多个实例放在 TCP/HTTP 负载均衡之后可以工作，代价见[故障排查](/zh/projects/winnerproxy/troubleshooting)（缓存命中率按实例独立、凭据共用）。大多数场景一台主机一个进程即可。

## 二进制部署

1. 把 `winnerproxy` 二进制复制到任意目录。
2. 在任意工作目录运行 `./winnerproxy`。首次启动时服务会在**可执行文件同目录**写入默认的 `config.yml`（路径由可执行文件位置推导，与工作目录无关），并在日志中提示需要编辑。
3. 填入 `upstreams.hrpauth.client_id` / `client_secret`（如果单独设置了 `hrpauth.*`，一并填入）。凭据为空时启动日志会打印 `WARN: hrpauth client_id or client_secret is empty; proxy-authenticated requests will fail`，所有需要令牌的上游调用都会失败。
4. 重启服务。配置只在启动时读取一次，没有热重载。
5. 把目录属主改为服务用户，并 `chmod 600 config.yml`——文件里有客户端密钥。

### systemd unit（模板）

```ini
# /etc/systemd/system/winnerproxy.service
[Unit]
Description=WinnerProxy
After=network.target

[Service]
Type=simple
# 按需设置 User / Group。不需要 WorkingDirectory：
# 配置路径由可执行文件位置推导。
ExecStart=/path/to/winnerproxy
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/path/to/winnerproxy-dir

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now winnerproxy
sudo systemctl status winnerproxy
```

`ExecStart` 与 `ReadWritePaths` 替换为实际部署路径。

## 容器部署

HA-Services-Deployer 提供容器化部署的 compose 服务与配置模板：镜像从 `/app` 运行二进制，用 `CONFIG_TEMPLATE` / `RENDERED_CONFIG` 渲染 `config.yml`，暴露 `2777` 端口。模板与环境变量见[容器编排](/zh/projects/ha-services-deployer/container-orchestration)。

## 联调

启动后依次执行三条检查，全部应成功：

```bash
# 1. WinnerProxy 自身（默认端口 2777）
curl http://127.0.0.1:2777/health
# → {"status":"ok"}

# 2. HRPAuth 管理面根地址可达（默认端口 2778）
curl http://127.0.0.1:2778/
# → Yggdrasil meta JSON

# 3. Mojang 出站可达
curl -sI 'https://sessionserver.mojang.com/session/minecraft/hasJoined?username=Notch'
# → 204/200（204 是正常的）
```

Minecraft 客户端用 authlib-injector 指向代理——JVM 参数取代理根路径（或 `/winnerproxy` 前缀）：

```text
-javaagent:authlib-injector.jar=http://your-winnerproxy:2777
```

## 上线检查清单

- [ ] `config.yml` 已 `chmod 600`，属主为服务用户
- [ ] `upstreams.hrpauth.url` 带 `/yggdrasil-api/` relay 前缀；`hrpauth.url`（如单独设置）是不带前缀的管理面根地址
- [ ] OAuth2 客户端已在核心上创建，`config.yml` 里的凭据与之一致
- [ ] 上面两条 HRPAuth 与 Mojang 可达性检查均通过
- [ ] `/health` 从监控位置可访问
- [ ] `config.yml` 已备份到密钥管理（绝不提交到 git）

## 资源占用

容量规划用的粗略估计：

| 资源 | 占用 | 说明 |
|---|---|---|
| 内存 | 约 100 MiB + Go 堆 | `cache.size` 默认 100 MiB，进程自身另需约 50–80 MiB |
| CPU | 空闲时接近零 | 单核可支撑数百 QPS |
| 磁盘 | 无 | 无本地持久化数据 |

## 不要做的事

- 不要把 WinnerProxy 直接暴露到公网。它只应在 Minecraft 服务端与 HRPAuth 之间的网络可达；未鉴权的 Yggdrasil 端点公网暴露会招来会话滥用。
- 不要用 root 运行，使用专用服务用户。
- 不要把客户端密钥暴露到 Minecraft 服务端可达的网络，它是服务级凭据。
- 不要热重载配置，编辑 `config.yml` 后重启进程。
- 不要把 `cache.size` 设为 `0` 并期待"无限制"——`0` 表示关闭缓存。

## 相关页面

- [配置](/zh/projects/winnerproxy/configuration)：全部配置键
- [故障排查](/zh/projects/winnerproxy/troubleshooting)：日志与故障模式
- [容器编排](/zh/projects/ha-services-deployer/container-orchestration)：部署器模板
