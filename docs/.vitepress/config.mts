import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'SamuelWiki',
  description: '面向产品团队的现代化 wiki 与文档中心',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    search: {
      provider: 'local'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '开始使用', link: '/guide/' },
      { text: '参考资料', link: '/reference/' },
      { text: 'FAQ', link: '/faq' },
      { text: '更新记录', link: '/changelog' },
      { text: '关于', link: '/about' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始使用',
          items: [
            { text: '概览', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '项目结构', link: '/guide/project-structure' },
            { text: '文档编写规范', link: '/guide/writing-docs' }
          ]
        }
      ],
      '/reference/': [
        {
          text: '参考资料',
          items: [
            { text: '概览', link: '/reference/' },
            { text: '站点架构', link: '/reference/architecture' },
            { text: '内容模型', link: '/reference/content-model' },
            { text: '部署说明', link: '/reference/deployment' }
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
      message: '使用 VitePress 构建的产品文档与知识中心',
      copyright: 'Copyright © 2026 SamuelWiki'
    }
  }
})
