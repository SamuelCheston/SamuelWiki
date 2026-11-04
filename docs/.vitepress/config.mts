import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'HRPAuth',
  description: 'A microservices-based authentication system environment for Minecraft',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: 'https://wiki.mcnb.dev'
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      link: '/',
      themeConfig: {
        search: {
          provider: 'local'
        },
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Getting Started', link: '/guide/' },
          { text: 'Reference', link: '/reference/' },
          { text: 'Projects', link: '/projects/' },
          { text: 'FAQ', link: '/faq' },
          { text: 'Changelog', link: '/changelog' },
          { text: 'About', link: '/about' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Overview', link: '/guide/' },
                { text: 'Quick Start', link: '/guide/getting-started' },
                { text: 'Configuration', link: '/guide/how-to-use-conf-file' }
              ]
            }
          ],
          '/reference/': [
            {
              text: 'Reference',
              items: [
                { text: 'Overview', link: '/reference/' },
                { text: 'Site Architecture', link: '/reference/architecture' },
                { text: 'Content Model', link: '/reference/content-model' },
                { text: 'Writing Conventions', link: '/reference/writing-docs' },
                { text: 'Deployment', link: '/reference/deployment' }
              ]
            }
          ],
          '/projects/': [
            {
              text: 'Authentication & Contract',
              items: [
                { text: 'Overview', link: '/projects/' },
                {
                  text: 'HA-Contract',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/ha-contract/' },
                    { text: 'Documentation Layout', link: '/projects/ha-contract/documentation-layout' },
                    { text: 'API Standards', link: '/projects/ha-contract/api-standards' }
                  ]
                },
                {
                  text: 'HRPAuth',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/hrpauth/' },
                    { text: 'Architecture', link: '/projects/hrpauth/architecture' },
                    { text: 'Configuration & API', link: '/projects/hrpauth/configuration' },
                    { text: 'Database Migrations', link: '/projects/hrpauth/database-migrations' }
                  ]
                },
                {
                  text: 'HRPAuth Yggdrasil API',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/hrpauth-yggdrasil-api/' },
                    { text: 'Architecture', link: '/projects/hrpauth-yggdrasil-api/architecture' },
                    { text: 'API Reference', link: '/projects/hrpauth-yggdrasil-api/api' }
                  ]
                },
                {
                  text: 'HRPAuth Web',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/hrpauth-web/' },
                    { text: 'Architecture', link: '/projects/hrpauth-web/architecture' },
                    { text: 'Configuration & Build', link: '/projects/hrpauth-web/configuration' }
                  ]
                },
                {
                  text: 'HASkinLib',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/haskinlib/' },
                    { text: 'Architecture', link: '/projects/haskinlib/architecture' },
                    { text: 'API Reference', link: '/projects/haskinlib/api' }
                  ]
                },
                {
                  text: 'HASkinProxy',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/haskinproxy/' },
                    { text: 'Architecture', link: '/projects/haskinproxy/architecture' },
                    { text: 'API Reference', link: '/projects/haskinproxy/api' }
                  ]
                },
                {
                  text: 'WinnerProxy',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/winnerproxy/' },
                    { text: 'Architecture', link: '/projects/winnerproxy/architecture' },
                    { text: 'Data Flow', link: '/projects/winnerproxy/data-flow' },
                    { text: 'Configuration', link: '/projects/winnerproxy/configuration' },
                    { text: 'Troubleshooting', link: '/projects/winnerproxy/troubleshooting' }
                  ]
                },
                { text: 'HRPAuth Spigot', link: '/projects/hrpauth-spigot/' }
              ]
            },
            {
              text: 'Service Orchestration',
              items: [
                {
                  text: 'HA Services Deployer',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/ha-services-deployer/' },
                    { text: 'Container Orchestration', link: '/projects/ha-services-deployer/container-orchestration' }
                  ]
                },
                { text: 'HA Services Maintenance View', link: '/projects/ha-services-maintenanceview/' },
                { text: 'HA WebUI SDK Handler', link: '/projects/ha-webui-sdkhandler/' }
              ]
            },
            {
              text: 'Match & Arena',
              items: [
                {
                  text: 'MatchCoreArena Server',
                  collapsed: true,
                  items: [
                    { text: 'Overview', link: '/projects/matchcorearena-server/' },
                    { text: 'Architecture', link: '/projects/matchcorearena-server/architecture' },
                    { text: 'Configuration & API', link: '/projects/matchcorearena-server/configuration' }
                  ]
                },
                { text: 'MatchCoreArena Client', link: '/projects/matchcorearena-client/' },
                { text: 'MatchCoreArena Maintenance View', link: '/projects/matchcorearena-maintenanceview/' },
                { text: 'BedwarsRel', link: '/projects/bedwarsrel/' },
                { text: 'BedwarsRel MCA', link: '/projects/bedwarsrel-mca/' }
              ]
            },
            {
              text: 'Clients & Tools',
              items: [
                { text: 'SamuelClient', link: '/projects/samuelclient/' },
                { text: 'BS2HA', link: '/projects/bs2ha/' }
              ]
            }
          ]
        },
        outline: {
          label: 'On this page',
          level: [2, 3]
        },
        docFooter: {
          prev: 'Previous page',
          next: 'Next page'
        },
        lastUpdated: {
          text: 'Last updated'
        },
        footer: {
          message: 'Built with VitePress for HRPAuth documentation',
          copyright: 'Copyright © 2026 HRPAuth'
        }
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        search: {
          provider: 'local'
        },
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '开始使用', link: '/zh/guide/' },
          { text: '参考资料', link: '/zh/reference/' },
          { text: '项目', link: '/zh/projects/' },
          { text: 'FAQ', link: '/zh/faq' },
          { text: '更新记录', link: '/zh/changelog' },
          { text: '关于', link: '/zh/about' }
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '开始使用',
              items: [
                { text: '概览', link: '/zh/guide/' },
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '配置文件使用', link: '/zh/guide/how-to-use-conf-file' }
              ]
            }
          ],
          '/zh/reference/': [
            {
              text: '参考资料',
              items: [
                { text: '概览', link: '/zh/reference/' },
                { text: '站点架构', link: '/zh/reference/architecture' },
                { text: '内容模型', link: '/zh/reference/content-model' },
                { text: '文档编写规范', link: '/zh/reference/writing-docs' },
                { text: '部署说明', link: '/zh/reference/deployment' }
              ]
            }
          ],
          '/zh/projects/': [
            {
              text: '认证与契约',
              items: [
                { text: '概览', link: '/zh/projects/' },
                {
                  text: 'HA-Contract',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/ha-contract/' },
                    { text: '文档体系结构', link: '/zh/projects/ha-contract/documentation-layout' },
                    { text: 'API 规范', link: '/zh/projects/ha-contract/api-standards' }
                  ]
                },
                {
                  text: 'HRPAuth',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/hrpauth/' },
                    { text: '架构说明', link: '/zh/projects/hrpauth/architecture' },
                    { text: '配置与接口', link: '/zh/projects/hrpauth/configuration' },
                    { text: '数据库迁移', link: '/zh/projects/hrpauth/database-migrations' }
                  ]
                },
                {
                  text: 'HRPAuth Yggdrasil API',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/hrpauth-yggdrasil-api/' },
                    { text: '架构说明', link: '/zh/projects/hrpauth-yggdrasil-api/architecture' },
                    { text: '接口参考', link: '/zh/projects/hrpauth-yggdrasil-api/api' }
                  ]
                },
                {
                  text: 'HRPAuth Web',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/hrpauth-web/' },
                    { text: '架构说明', link: '/zh/projects/hrpauth-web/architecture' },
                    { text: '配置与构建', link: '/zh/projects/hrpauth-web/configuration' }
                  ]
                },
                {
                  text: 'HASkinLib',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/haskinlib/' },
                    { text: '架构说明', link: '/zh/projects/haskinlib/architecture' },
                    { text: '接口参考', link: '/zh/projects/haskinlib/api' }
                  ]
                },
                {
                  text: 'HASkinProxy',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/haskinproxy/' },
                    { text: '架构说明', link: '/zh/projects/haskinproxy/architecture' },
                    { text: '接口参考', link: '/zh/projects/haskinproxy/api' }
                  ]
                },
                {
                  text: 'WinnerProxy',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/winnerproxy/' },
                    { text: '架构说明', link: '/zh/projects/winnerproxy/architecture' },
                    { text: '数据流转', link: '/zh/projects/winnerproxy/data-flow' },
                    { text: '配置说明', link: '/zh/projects/winnerproxy/configuration' },
                    { text: '故障排查', link: '/zh/projects/winnerproxy/troubleshooting' }
                  ]
                },
                { text: 'HRPAuth Spigot', link: '/zh/projects/hrpauth-spigot/' }
              ]
            },
            {
              text: '服务编排',
              items: [
                {
                  text: 'HA 服务部署器',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/ha-services-deployer/' },
                    { text: '容器编排', link: '/zh/projects/ha-services-deployer/container-orchestration' }
                  ]
                },
                { text: 'HA 服务运维视图', link: '/zh/projects/ha-services-maintenanceview/' },
                { text: 'HA WebUI SDK 处理器', link: '/zh/projects/ha-webui-sdkhandler/' }
              ]
            },
            {
              text: '对战竞技',
              items: [
                {
                  text: 'MatchCoreArena 服务端',
                  collapsed: true,
                  items: [
                    { text: '概览', link: '/zh/projects/matchcorearena-server/' },
                    { text: '架构说明', link: '/zh/projects/matchcorearena-server/architecture' },
                    { text: '配置与接口', link: '/zh/projects/matchcorearena-server/configuration' }
                  ]
                },
                { text: 'MatchCoreArena 客户端', link: '/zh/projects/matchcorearena-client/' },
                { text: 'MatchCoreArena 运维视图', link: '/zh/projects/matchcorearena-maintenanceview/' },
                { text: 'BedwarsRel', link: '/zh/projects/bedwarsrel/' },
                { text: 'BedwarsRel MCA', link: '/zh/projects/bedwarsrel-mca/' }
              ]
            },
            {
              text: '客户端与工具',
              items: [
                { text: 'SamuelClient', link: '/zh/projects/samuelclient/' },
                { text: 'BS2HA', link: '/zh/projects/bs2ha/' }
              ]
            }
          ]
        },
        outline: {
          label: '本页导航',
          level: [2, 3]
        },
        docFooter: {
          prev: '上一页',
          next: '下一页'
        },
        lastUpdated: {
          text: '最后更新于'
        },
        footer: {
          message: '使用 VitePress 构建的 HRPAuth 文档中心',
          copyright: 'Copyright © 2026 HRPAuth'
        }
      }
    }
  }
})
