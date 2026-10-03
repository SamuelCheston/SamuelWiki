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
  <a class="wiki-card" href="/zh/faq">
    <h3>FAQ</h3>
    <p>关于安装、配置和故障排除的常见问题。</p>
  </a>
  <a class="wiki-card" href="/zh/changelog">
    <h3>更新记录</h3>
    <p>跟踪 HRPAuth 服务演进和文档更新情况。</p>
  </a>
</div>

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
    <strong>3. 部署负责人</strong>
    查看 <a href="/zh/reference/deployment">部署参考</a> 以了解生产环境设置。
  </div>
</div>

## 项目生态

- **HRPAuth**: 核心验证服务 (OAuth2, Yggdrasil-API)。
- **HASkinLib**: 公共皮肤库广场。
- **WinnerProxy**: 为正版玩家保留 UUID 的代理。
- **HASkinProxy**: 为皮肤加载器提供的 API 转换代理。
