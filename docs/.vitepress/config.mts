import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'SamuelWiki',
  description: '基于 VitePress 构建的文档站点',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/' }
    ],
    sidebar: [
      {
        text: '开始使用',
        items: [
          { text: '介绍', link: '/guide/' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/' }
    ]
  }
})
