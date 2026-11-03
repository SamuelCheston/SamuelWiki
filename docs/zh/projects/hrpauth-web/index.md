# HRPAuth Web

HRPAuth Web 是 HRPAuth 认证核心的官方 Web 前端。它提供账号门户——登录、注册、账号安全、皮肤库——并在构建期承载各生态服务注入的 SDK 页面。

## 覆盖范围

- 账号门户：登录、注册、邮箱验证、密码找回
- 账号安全：资料、TOTP、恢复密钥、WebAuthn 通行密钥
- 皮肤库：浏览、上传、应用与删除皮肤和披风
- 用于查看后端接口流量的调试页
- 构建期注入的 SDK 路由、菜单项、控制面板项与资料卡片

## 技术栈

- React 19、TypeScript 5.9、Vite 7
- React Router 7 负责路由
- MUI v7 搭配 Emotion 作为组件层
- i18next 26，提供 `en` 与 `zh-CN` 两套语言
- skinview3d 做 3D 皮肤预览，qrcode.react 生成 TOTP 二维码
- Vitest、Testing Library 与 jsdom 负责测试
- ESLint 9 搭配 typescript-eslint

构建产物是纯静态 SPA。它通过 HTTP 与后端通信，本身不承载任何服务端逻辑。

## 目录结构

```text
src/pages/        # 路由组件：Home、Skinlib、Dashboard、Login、Register 等
src/api/          # 后端调用封装，按领域拆分为独立模块
src/components/   # Layout、Navbar、Captcha、LanguageSwitcher、恢复密钥打印页
src/hooks/        # 通用 Hook，例如 useMeta
src/utils/        # config、api、auth、cookie、dataCache、email、webauthn
src/generated/    # 构建期 SDK 聚合产物
src/i18n/         # i18next 初始化与语言文件
src/types/        # 共享的 TypeScript 类型
config/           # backend-dev.json、meta.json
public/           # config.json、logo.svg、.htaccess
```

## 运行方式

### 运行前准备

- Node.js 22 或更高版本，以及 npm
- 一个可访问的 HRPAuth 核心，用于 `baseUrl`
- 一个可访问的 HASkinLib 服务，用于 `skinlibUrl`

### 构建

```bash
npm install
npm run build
```

`npm run build` 实际执行 `tsc -b && vite build`，产物落在 `dist/`。另外两个脚本值得记住：

```bash
npm run lint
npm run test:run
```

### 运行

```bash
npm run dev
```

开发服务器会把请求代理到 `config/backend-dev.json` 里的后端地址，因此浏览器始终停留在同一个源上。`npm run preview` 用于本地预览已构建的 `dist/`。

## 配置

这里有两份配置文件，职责各不相同。

- `config/backend-dev.json` 由 Vite 在启动时读取，用来设置开发态代理目标。`baseUrl` 与 `skinlibUrl` 都必填；缺少 `skinlibUrl` 时开发服务器无法启动。
- `public/config.json` 是运行期配置。构建时会把它复制为 `dist/config.json`，部署后可以直接在服务器上编辑，不需要重新构建。

字段语义、清洗规则与部署要求见[配置与构建](/zh/projects/hrpauth-web/configuration)。

## 与其它项目的关系

- **依赖** [HRPAuth](/zh/projects/hrpauth/) 作为主后端
- **依赖** [HASkinLib](/zh/projects/haskinlib/) 提供皮肤库
- **访问** [HRPAuth Yggdrasil API](/zh/projects/hrpauth-yggdrasil-api/)，走核心暴露的 `/yggdrasil-api` 前缀
- **被扩展于** [HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/)，由它把 SDK 包注入构建

## 相关页面

- [架构说明](/zh/projects/hrpauth-web/architecture)：分层、路由与 SDK 注入如何组织在一起
- [配置与构建](/zh/projects/hrpauth-web/configuration)：两套配置与部署检查清单
- [HRPAuth](/zh/projects/hrpauth/)：这个前端所对接的后端
