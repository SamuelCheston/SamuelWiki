# 关于 HRPAuth

HRPAuth 是一个为 Minecraft 社区设计的强大、可扩展且易于维护的身份验证系统环境。它利用微服务架构提供全功能的身份验证体验。

## 目标

- 为 Minecraft 玩家提供安全可靠的身份验证入口。
- 通过基于微服务的设计确保高可用性和可扩展性。
- 通过官方和第三方服务的集成提供无缝体验。
- 简化复杂身份验证环境的部署和管理。

## 核心特点

- **微服务架构**: HRPAuth、HASkinLib、WinnerProxy 和 HASkinProxy 等组件高效协作。
- **可扩展性**: 轻松集成第三方服务以扩展生态系统。
- **简易配置**: 所有服务均采用基于 YAML 的简单配置。
- **高性能**: 针对高并发身份验证请求进行了优化。

## 项目生态

- **HRPAuth**: 提供 OAuth2 和 Yggdrasil-API 的核心服务。
- **HASkinLib**: 用于管理和提供 Minecraft 皮肤的专用库。
- **WinnerProxy**: 为正版玩家保留 UUID 的代理服务。
- **HASkinProxy**: 将 Yggdrasil-API 请求转换为 CustomSkinLoader-API。
