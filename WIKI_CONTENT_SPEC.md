# Wiki 内容规范

## 目录约束

`wiki/` 目录只作为内容根目录使用，当前约束如下：

1. `wiki/` 第一层目录不直接存放 `.md` 文件。
2. 所有 Markdown 文件都必须位于 `wiki/<group>/<project>/`。
3. 每个第二层目录代表一个独立项目的 Wiki。

示例：

```text
wiki/
  business/
    hrp-auth/
      index.md
      quick-start.md
      faq.md
```

## Frontmatter 规范

建议第一版统一使用以下字段：

```yaml
---
title: 项目首页
description: 项目 Wiki 的简要说明
order: 1
tags:
  - auth
  - wiki
updatedAt: 2026-08-14
---
```

字段说明：

1. `title`：页面标题，建议必填。
2. `description`：页面摘要，用于列表页和 SEO 文案。
3. `order`：页面排序，数字越小越靠前。
4. `tags`：页面标签数组。
5. `updatedAt`：最后更新时间，建议使用 `YYYY-MM-DD`。

## 页面约定

1. 每个项目目录至少包含一个 `index.md`。
2. `index.md` 作为项目首页，对应路由 `/projects/<group>/<project>`。
3. 其他 Markdown 文件名会映射为页面 slug，例如 `quick-start.md` 对应 `/projects/<group>/<project>/quick-start`。
