# 博客 / 内容

## 文章

- 位置：`src/content/blog/<slug>/index.md` —— Content Collections（`src/content.config.ts`）。
- frontmatter 用 `content.config.ts` 里的 Zod（`astro/zod`）校验。

## Frontmatter

- **`description` 必填**（列表/SEO 用）；写真实摘要，不是正文第一行或裸 URL。
- 字段：`title`、`description`、`cover`、`coverLayout`（`overlay` | `below`）、`category`、`tags`、`pubDate`、`updatedDate`、`language`、`draft`。

## 服务端模块 vs 客户端模块

- 服务端加载器：`src/lib/posts.ts`（`getCollection` / `getImage` / `render`）——**绝不能从 Vue island 导入**（构建失败：`ServerOnlyModule` / `astro:content`）。
- 客户端安全：`src/lib/post-model.ts`（+ `archive.ts` / `search.ts`）。客户端类型和纯助手函数从各自所属模块导入，不要绕道服务端专用的 `posts.ts`。
- 搜索弹窗用 `/search-index.json`（`src/pages/search-index.json.ts`）。

## 封面

- 放在文章旁边（`./cover.webp` / `./cover.jpg`），这样 `image()` + `getImage` 才能优化。**不要**用 `public/` 路径放封面。

## 排序与布局

- 排序：`pubDate` 新的在前（slug 决胜）。
- 首页列表：CSS **`columns` 瀑布流**——除非用户要求，不要改成行优先 Grid。

## 草稿

- `draft: true` 会从列表、搜索、feed、静态路径中排除。
