# Debug Session: homepage-white-screen

- Status: OPEN
- Symptom: dev 正常，但构建后部署到外部 webserver 访问首页仍然白屏，无任何内容。
- Scope: 生产构建 / 静态部署 / 首页首次加载
- Session ID: homepage-white-screen

## Hypotheses

1. 构建后的入口脚本已经加载，但 React 在运行期抛异常，导致根节点没有渲染内容。
2. 首页依赖的某个动态 import 或 vendor chunk 在外部环境加载失败，页面卡在初始化阶段。
3. Chakra UI Provider 或主题系统在生产构建下触发运行时错误，导致整棵树挂掉。
4. 浏览器实际访问路径与 hash/router、资源相对路径之间仍有冲突，导致初始化路由异常。
5. 外部 webserver 返回的 MIME type、缓存或压缩配置有问题，导致模块脚本未执行。

## Evidence Log

- Pending runtime evidence collection.
