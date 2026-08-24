# 博客 / 内容

## 文章

- 位置：`src/content/blog/<slug>/index.md` —— Content Collections（`src/content.config.ts`）。
- frontmatter 用 `content.config.ts` 里的 Zod（`astro/zod`）校验。

## Frontmatter

- **`description`、`pubDate` 必填**；摘要用于列表/SEO，写真实内容，不是正文第一行或裸 URL。
- 字段：`title`、`description`、`cover`、`coverLayout`（`overlay` | `below`）、`category`、`tags`、`author`、`pubDate`、`updatedDate`、`language`、`draft`。
- `author` 可选，格式为 `{ name, url? }`；缺省时结构化 SEO 使用 `siteConfig.profile` 作为作者。转载文章应填写真实作者覆盖值，不要让默认值造成错误归因。
- `updatedDate` 可选；未填写时结构化数据的 `dateModified` 与 `pubDate` 相同，页面不会显示“更新于”。

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
