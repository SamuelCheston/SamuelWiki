# 快速开始

本页面将帮助您在本地运行、预览和构建 HRPAuth。

## 运行 HRPAuth
HRPAuth 是 HRPAuth 的核心服务。
它提供 HRPAuth OAuth2 业务认证服务与微服务扩展层；Yggdrasil 协议面由独立的 [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/) 服务提供。

### 下载 HRPAuth
从 [GitHub](https://github.com/CoreMatch/HRPAuth/releases/latest) 下载最新版本。
创建一个 Mysql 用户 `hrpa`，密码为 `hrpa`。
创建一个由 `hrpa` 拥有的数据库 `hrpa`。
部署一个不带密码的 Redis 实例。

### 首次运行
运行发布版本。
```bash
./HRPAuth-ver-os-arch
```
它会自动生成配置文件、应用数据库迁移并确保内置 OAuth2 客户端存在，然后启动服务器。
您应该设置一个守护进程来保持所有服务运行。
推荐的守护进程：[tinyvisor](https://github.com/SamuelCheston/Tinyvisor) [systemd](https://www.systemd.io/) [supervisor](https://supervisord.org/) [aaPanel](https://www.aapanel.com/)

## 运行 HASkinLib
HASkinLib 是 HRPAuth 的公共皮肤广场。
根据设计初衷，您应该为皮肤库创建一个单独的数据库。
但为了方便起见，它应该与 HRPAuth 运行在同一个数据库上。

### 下载 HASkinLib
从 [GitHub](https://github.com/CoreMatch/HASkinLib/releases/latest) 下载最新版本。

### 首次运行
尝试运行它以生成配置文件。
```bash
./HASkinLib-ver-os-arch
```
根据需要修改配置文件，文件中附有注释。
```
nano ./config.yaml
```
再次运行发布版本。
```bash
./HASkinLib-ver-os-arch
```

## 运行 WinnerProxy
WinnerProxy 让您可以同时保留 HRPAuth 玩家和 Mojang 玩家。
所有 Mojang 玩家的 UUID 将被保留为 HRPAuth 玩家的 UUID。
更多详情请参阅 [WinnerProxy](https://github.com/CoreMatch/WinnerProxy)。

### 下载 WinnerProxy
从 [GitHub](https://github.com/CoreMatch/WinnerProxy/releases/latest) 下载最新版本。

### 首次运行
尝试运行它以生成配置文件。
```bash
./WinnerProxy-ver-os-arch
```
根据需要修改配置文件，文件中附有注释。注意 WinnerProxy 读取的是 `config.yml`（`.yml` 扩展名），同目录下的 `config.yaml` 会被忽略。
```
nano ./config.yml
```
再次运行发布版本。
```bash
./WinnerProxy-ver-os-arch
```

## 运行 HASkinProxy
HASkinProxy 是一个将 Yggdrasil-API 请求转换为 CustomSkinLoader-API 请求的代理。
更多详情请参阅 [HASkinProxy](https://github.com/CoreMatch/HASkinProxy)。

### 下载 HASkinProxy
从 [GitHub](https://github.com/CoreMatch/HASkinProxy/releases/latest) 下载最新版本。

### 首次运行
尝试运行它以生成配置文件。
```bash
./HASkinProxy-ver-os-arch
```
根据需要修改配置文件，文件中附有注释。
```
nano ./config.yaml
```
再次运行发布版本。
```bash
./HASkinProxy-ver-os-arch
```
