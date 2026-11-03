---
layout: home

hero:
  name: HRPAuth
  text: 微服务身份验证系统
  tagline: 为 Minecraft 社区提供强大、可扩展且易于维护的身份验证环境。
  actions:
    - theme: brand
      text: 开始使用
      link: /zh/guide/
    - theme: alt
      text: 查看参考资料
      link: /zh/reference/

features:
  - title: 微服务架构
    details: 采用微服务构建，确保现代身份验证需求下的可扩展性和可维护性。
  - title: 官方与第三方服务
    details: 部署官方服务以获得完整功能，或集成第三方服务以扩展功能。
  - title: 简易部署
    details: 只需极简配置即可快速启动，开箱即用支持 MySQL 和 Redis。
---

## 核心组件

<div class="wiki-grid">
  <a class="wiki-card" href="/zh/guide/">
    <h3>开始使用</h3>
    <p>了解项目初衷、部署步骤以及如何运行 HRPAuth。</p>
  </a>
  <a class="wiki-card" href="/zh/guide/getting-started">
    <h3>快速开始</h3>
    <p>HRPAuth、HASkinLib、WinnerProxy 和 HASkinProxy 的分步操作指南。</p>
  </a>
  <a class="wiki-card" href="/zh/projects/">
    <h3>项目</h3>
    <p>HA 生态中每一个服务的独立说明文档。</p>
  </a>
  <a class="wiki-card" href="/zh/faq">
    <h3>FAQ</h3>
    <p>关于安装、配置和故障排除的常见问题。</p>
  </a>
  <a class="wiki-card" href="/zh/changelog">
    <h3>更新记录</h3>
    <p>跟踪 HRPAuth 服务演进和文档更新情况。</p>
  </a>
</div>

## 项目生态

<div class="wiki-grid">
  <a class="wiki-card" href="/zh/projects/#认证与契约">
    <h3>认证与契约</h3>
    <p>HRPAuth、Yggdrasil API、Web 界面、皮肤库以及皮肤代理。</p>
  </a>
  <a class="wiki-card" href="/zh/projects/#服务编排">
    <h3>服务编排</h3>
    <p>部署器、运维视图以及 WebUI SDK 处理器。</p>
  </a>
  <a class="wiki-card" href="/zh/projects/#对战竞技">
    <h3>对战竞技</h3>
    <p>MatchCoreArena 服务端、客户端、运维视图以及 Bedwars 插件。</p>
  </a>
  <a class="wiki-card" href="/zh/projects/#客户端与工具">
    <h3>客户端与工具</h3>
    <p>与整套服务一同维护的桌面客户端和独立工具。</p>
  </a>
</div>

### 认证与契约

- **[HA-Contract](/zh/projects/ha-contract/)**：API 契约与规范的单一事实源。
- **[HRPAuth](/zh/projects/hrpauth/)**：核心验证服务 (OAuth2, Yggdrasil-API)。
- **[HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)**：Yggdrasil API 提供者与游戏账号管理。
- **[HRPAuth Web](/zh/projects/hrpauth-web/)**：身份验证服务的前端界面。
- **[HRPAuth Spigot](/zh/projects/hrpauth-spigot/)**：把整套服务接入代理的 Minecraft 服务端插件。
- **[HASkinLib](/zh/projects/haskinlib/)**：公共皮肤库广场。
- **[HASkinProxy](/zh/projects/haskinproxy/)**：为皮肤加载器提供的 API 转换代理。
- **[WinnerProxy](/zh/projects/winnerproxy/)**：为正版玩家保留 UUID 的代理。

### 服务编排

- **[HA 服务部署器](/zh/projects/ha-services-deployer/)**：一条命令部署整套服务。
- **[HA 服务运维视图](/zh/projects/ha-services-maintenanceview/)**：面向已部署服务的运维面板。
- **[HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/)**：在编译期把卫星 SDK 打进 WebUI。

### 对战竞技

- **[MatchCoreArena 服务端](/zh/projects/matchcorearena-server/)**：竞技场匹配的服务端权威实现。
- **[MatchCoreArena 客户端](/zh/projects/matchcorearena-client/)**：竞技场服务的配套客户端与大厅。
- **[MatchCoreArena 运维视图](/zh/projects/matchcorearena-maintenanceview/)**：竞技场运维用的桌面面板。
- **[BedwarsRel](/zh/projects/bedwarsrel/)**：支持多版本的对战匹配插件。
- **[BedwarsRel MCA](/zh/projects/bedwarsrel-mca/)**：为 MatchCoreArena 打造的 BedwarsRel 变体。

### 客户端与工具

- **[SamuelClient](/zh/projects/samuelclient/)**：用于个人账号管理的桌面客户端。
- **[BS2HA](/zh/projects/bs2ha/)**：把 Blessing-Skin-Server 数据一次性迁移进 HRPAuth 的离线命令行工具。

## 推荐阅读路径

<div class="wiki-list">
  <div class="wiki-list-item">
    <strong>1. 新管理员</strong>
    从 <a href="/zh/guide/">项目概览</a> 开始，然后按照 <a href="/zh/guide/getting-started">快速开始</a> 指南操作。
  </div>
  <div class="wiki-list-item">
    <strong>2. 进阶配置</strong>
    在 <a href="/zh/guide/how-to-use-conf-file">配置文件使用指南</a> 中学习如何自定义设置。
  </div>
  <div class="wiki-list-item">
    <strong>3. 参与某个项目</strong>
    直接进入 <a href="/zh/projects/">项目</a> 分区，阅读你正在改动的那个服务的页面。
  </div>
  <div class="wiki-list-item">
    <strong>4. 部署负责人</strong>
    查看 <a href="/zh/reference/deployment">部署参考</a> 以了解生产环境设置。
  </div>
</div>
