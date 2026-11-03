# 配置与构建

HRPAuth Web 没有环境变量，也没有配置接口。后端地址来自两个 JSON 文件：一个用于开发，一个用于生产。本页说明每个字段的含义、取值如何被清洗，以及部署时需要准备什么。

## 两套配置

### 开发态：`config/backend-dev.json`

`vite.config.ts` 在启动时读取这个文件，把两个地址用作代理目标。浏览器看不到这些值。

```json
{
  "baseUrl": "https://ha.example.com",
  "skinlibUrl": "http://127.0.0.1:2701"
}
```

两个字段都必填。该文件用普通的 `JSON.parse` 解析，缺少 `skinlibUrl` 时 `npm run dev` 会在服务器启动前直接失败。

### 生产态：`public/config.json`

这是运行期配置。构建会把 `public/` 复制到 `dist/`，因此文件最终位于 `dist/config.json`，浏览器以禁用缓存的方式从 `${BASE_URL}/config.json` 拉取。

```json
{
  "baseUrl": "https://ha.example.com/",
  "skinlibUrl": "https://skin.example.com/"
}
```

因为它就是一个静态文件，部署后可以直接在服务器上编辑，不需要重新构建。

## 字段语义

### `baseUrl`

HRPAuth 核心。前端用它访问业务接口、请求 `GET /status`，以及访问核心中继到 Yggdrasil API 服务的 `/yggdrasil-api` 前缀。

### `skinlibUrl`

HASkinLib 服务。皮肤库页面用它来列出、上传、应用和删除纹理。

在开发态，浏览器看不到这个地址。它会被改写成 `/skinlib-api`，再由 Vite 代理转发到 `skinlibUrl`。

## 清洗与回落行为

`src/utils/config.ts` 会规范化它读到的每一个值。

- 反引号、单引号、双引号会被去掉
- 末尾斜杠会被去掉
- 开发态下 `BackendUrl` 保持为空，含义是走同源请求；`SkinlibUrl` 变为 `/skinlib-api`
- 生产态下两个值都来自 `${BASE_URL}/config.json`

回落规则比清洗规则更需要留意。

- 任一字段缺失或为空时，整份配置被忽略，两个地址回落到空默认值
- `config.json` 格式错误或无法获取时，只记录日志并忽略，同样使用空默认值
- `getRealBackendUrl()` 会请求 `{baseUrl}/status`，取回其中 `backend.url` 字段作为真实后端地址并缓存
- 该请求失败时，`getRealBackendUrl()` 回落到 relay 地址

业务代码一律读取导出的 `BackendUrl` 与 `SkinlibUrl` 常量，不自行判断运行环境。

## 开发态代理

`vite.config.ts` 配置了两条代理规则。

- `^/skinlib-api/` 转发到 `skinlibUrl`，转发时去掉该前缀
- `^/` 转发到 `baseUrl`

Vite 自己负责处理内部路径，任何带文件扩展名的请求都按静态资源处理。接受 `text/html` 的导航请求会回落到 `/index.html`。

## 部署要求

### SPA fallback

`dist/` 是带客户端路由的静态产物。Web 服务器必须把未知路径重写到 `index.html`，否则直接访问 `/dash` 会返回 404。

仓库里提供了 Apache 示例，位于 `htaccess.example`：

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On

  # Skip existing files/directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Rewrite all other requests to index.html
  RewriteRule ^ index.html [L]
</IfModule>
```

同样的内容已经放在 `public/.htaccess` 里。

### 部署后修改 `config.json`

后端地址不会被编译进产物。部署完成后直接编辑 `dist/config.json` 并刷新页面即可。如果前端与核心不在同一个源上，核心还需要在自身配置里放行前端所在来源。

## 其它配置文件

`config/meta.json` 保存各页面的标题、描述、关键词，以及 Open Graph 与 Twitter 标签。`useMeta` Hook 按页面键读取它。该文件在构建期打包，运行期不可编辑。

## 相关页面

- [概览](/zh/projects/hrpauth-web/)
- [架构说明](/zh/projects/hrpauth-web/architecture)
- [HRPAuth](/zh/projects/hrpauth/configuration)：后端一侧的 CORS 与端口配置
