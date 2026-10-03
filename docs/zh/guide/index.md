# 开始使用

## 项目初衷
HRPAuth 是一套旨在创建身份验证系统环境的工具集。
为了使其具有可扩展性和可维护性，我们采用了微服务架构。
我们建议您尽可能部署所有官方服务，以便享受 HRPAuth 的完整功能。
此外，您还可以部署第三方服务来扩展 HRPAuth 的功能。

## 极简快速启动 (不推荐，仅用于展示原意)
从 [GitHub](https://github.com/CoreMatch/HRPAuth/releases/latest) 下载最新版本。
创建一个 Mysql 用户 `hrpa`，密码为 `hrpa`。
创建一个由 `hrpa` 拥有的数据库 `hrpa`。
部署一个不带密码的 Redis 实例。
运行发布版本。
```bash
./HRPAuth-ver-os-arch
```
它将自动初始化数据库架构、配置文件和密钥对，然后启动服务器。
