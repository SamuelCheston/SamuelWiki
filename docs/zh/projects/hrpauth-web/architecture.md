# 架构说明

HRPAuth Web 是一个单页应用，划分很干脆：自有的页面放在 `src/pages`，卫星服务贡献的内容全部以生成文件的形式进入构建。本页说明这个划分、路由如何工作、SDK 包如何进入构建，以及两套语言如何接线。

## 分层结构

### 页面层

`src/pages` 存放每个路由对应的组件：`Home`、`Skinlib`、`Dashboard`、`DashboardDebug`、`Login`、`Register`、`ForgotPassword`、`VerifyEmail`、`Profile`、`AccountSecurity`。

`Profile` 与 `AccountSecurity` 本身不是路由。它们是 `Dashboard` 里的面板，由侧边栏列表驱动切换，不做整页刷新。`/profile` 路由只负责重定向到 `/dash`。

### 接口层

`src/api` 封装后端调用，按领域拆分为独立模块：`auth`、`register`、`user`、`captcha`、`texture`、`services`。

每个模块都用导出的 `BackendUrl` 与 `SkinlibUrl` 常量拼接地址，再调用 `src/utils/api.ts` 里的公共 `request` 封装。该封装负责附带访问令牌，并在收到未授权响应时自动刷新一次。

### 组件层

`src/components` 存放外壳与可复用控件：`Layout` 与导航框架、`Navbar`、`Captcha`、`LanguageSwitcher`、`VerificationMethodPickerDialog`，以及恢复密钥打印页。

### 工具层

`src/utils` 存放横切能力：`config` 负责后端地址，`api` 负责请求链路与令牌刷新，`auth` 负责登录完成后的公共流程，`cookie` 负责会话 Cookie，`dataCache` 负责预取控制面板数据，`email` 负责邮箱地址校验，`webauthn` 负责通行密钥流程。

### 生成层

`src/generated` 由构建写入，人工不修改。这些文件带有 "GENERATED — DO NOT EDIT" 头注释，仓库里提交的是空占位内容。

## 路由与懒加载

### 路由表

- `/` — Home
- `/skinlib` — Skinlib
- `/dash` — Dashboard
- `/dashdebug` — DashboardDebug
- `/login` — Login
- `/register` — Register
- `/forgot-password` — ForgotPassword
- `/verifyemail` — VerifyEmail
- `/profile` — 重定向到 `/dash`
- 构建期注入的 SDK 路由

### 懒加载与 Suspense

`src/App.tsx` 中每个页面都通过 `React.lazy` 加载。整棵路由树位于同一个 `Suspense` 边界内，因此自有页面与 SDK 路由共用一个回退界面。

### 分包

`vite.config.ts` 里的 `build.rollupOptions.output.manualChunks` 把产物拆成四个固定分块：`react-vendor`、`mui-core`、`mui-icons`、`skinview3d-vendor`。

## 构建期 SDK 注入

### 占位文件

`src/generated` 下有六个空占位文件，构建时被覆盖：

- `sdk-routes.tsx` — 挂载在 `<Routes>` 内的路由元素
- `sdk-navbar.tsx` — 导航栏附加菜单项
- `sdk-dashboard.tsx` — 控制面板侧边栏附加项
- `sdk-profile-cards.tsx` — 资料页附加卡片
- `sdk-critical-operations.tsx` — 账号安全页关键操作区的附加项
- `sdk-manifest.ts` — 所有被注入服务的清单

### 服务包

每个 SDK 包落在 `src/generated/services/<name>/` 下，包含一个 `manifest.json` 与一个 `src/` 目录。

`manifest.json` 描述该服务贡献什么：`routes` 给出路径、模块与标题，`menu` 与 `dashboard` 给出菜单项和面板项，`dependencies` 给出该包需要的 npm 依赖。

当前目录里有两个服务包：

```text
src/generated/services/yggdrasil-api/   # Mojang 绑定、纹理管理、接口页
src/generated/services/haskinproxy/      # CustomSkinLoader 配置页
```

### 注入产物的落点

- `sdk-routes` 以 `{sdkRouteElements}` 的形式嵌入 `src/App.tsx`，与自有路由处在同一个 `Suspense` 边界内
- `sdk-navbar` 由 `Navbar` 读取
- `sdk-dashboard` 由 `Dashboard` 侧边栏读取
- `sdk-profile-cards` 由 `Profile` 读取
- `sdk-critical-operations` 由 `AccountSecurity` 读取

运行期发现机制已经移除。前端不再请求 `GET /services/list`，`src/api/services.ts` 只保留 presence、route、relay 这几条旁路接口。

## 国际化

### 初始化

`src/i18n/index.ts` 用浏览器语言检测器初始化 i18next。

- 资源：`en` 与 `zh-CN`
- `lng` 为 `en`，`fallbackLng` 为 `en`
- `supportedLngs` 精确为 `['zh-CN', 'en']`
- 检测顺序：`localStorage`、`navigator`、`htmlTag`
- 选择结果缓存在 `localStorage`，键名为 `hrpauth-lang`

该文件的注释特别提醒不要开启 `nonExplicitSupportedLngs`。在 i18next v26 下，初始化会把 `zh-CN` 归一化为 `zh`，再按 `supportedLngs` 过滤，导致 `zh-CN` 被判定为不支持，所有查找都回落到英文。

### 语言切换

`LanguageSwitcher` 用 `SUPPORTED_LANGUAGES` 与 `LANGUAGE_LABELS` 渲染一个菜单，选中后调用 `i18n.changeLanguage`。检测缓存会保存这次选择，刷新后仍然保持。

### SDK 服务语言包

SDK 包自带翻译，位于 `services/<name>/src/locales`，并通过自己的 Hook 取用，而不是应用层的 `t` 函数。Yggdrasil API 包用的就是 `useSdkTranslation`。

## 相关页面

- [概览](/zh/projects/hrpauth-web/)
- [配置与构建](/zh/projects/hrpauth-web/configuration)
- [HA WebUI SDK 处理器](/zh/projects/ha-webui-sdkhandler/)：执行注入的服务
- [HRPAuth](/zh/projects/hrpauth/)：`/services/*` 扩展层所在的服务
