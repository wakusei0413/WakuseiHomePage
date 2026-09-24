# 路由与静态端点一览 (Routes)

本项目为纯静态站点（`output: 'static'`），所有页面与数据端点均在构建期（`npm run build`）预先生成为静态文件，无需后端服务器或 Serverless 运行时。

---

## 📄 页面路由

| 路径 | 对应文件 | Shell 模式 | 说明 |
|---|---|---|---|
| `/` | `src/pages/index.astro` | `shellMode="home"` | 首页：英雄区、个人卡片、标语与文章列表（`#posts`） |
| `/page/[page]` | `src/pages/page/[page].astro` | `shellMode="home"` | 首页文章列表静态分页（从第 2 页开始生成，保持首屏 SEO 干净） |
| `/posts/[...slug]` | `src/pages/posts/[...slug].astro` | `shellMode="article"` | 博客正文详情页，集成阅读控制面板与文章目录 |
| `/archives` | `src/pages/archives.astro` | `shellMode="blog"` | 时间线归档页面，按年份聚拢全部文章 |
| `/topics` | `src/pages/topics/index.astro` | `shellMode="blog"` | 话题聚合总览与子路由 |
| `/categories` | `src/pages/categories/index.astro` | `shellMode="blog"` | 分类聚合总览与各分类文章列表 |
| `/tags` | `src/pages/tags/index.astro` | `shellMode="blog"` | 标签云聚合总览与各标签文章列表 |
| `/search` | `src/pages/search.astro` | `shellMode="blog"` | 独立搜索页面（与顶栏全局弹窗共用搜索核心）；支持 `?q=关键词` 直达结果 |
| `/404` | `src/pages/404.astro` | `shellMode="error"` | 自定义 404 错误页面 |

---

## 📡 静态数据与订阅端点 (API & Feeds)

| 端点路径 | 对应生成源 | 说明 |
|---|---|---|
| `/rss.xml` | `src/pages/rss.xml.ts` | 标准 RSS 2.0 订阅源，自动包含全部非草稿文章 |
| `/atom.xml` | `src/pages/atom.xml.ts` | Atom 1.0 格式订阅源 |
| `/search-index.json` | `src/pages/search-index.json.ts` | 客户端毫秒级搜索索引文件，包含文章标题、摘要、分类与标签 |
| `/github-contributions.json` | `src/pages/github-contributions.json.ts` | GitHub 53 周提交热力图数据快照（构建期由服务端抓取并转为静态 JSON） |
| `/featured-posts.json` | `src/pages/featured-posts.json.ts` | 站点精选/置顶文章静态 JSON 数据 |
| `/og-default.jpg` | `src/pages/og-default.jpg.ts` | 构建期用 Sharp 把默认壁纸裁成 1200×630 的社交分享卡，供没有独立封面的页面作为 `og:image` 使用 |

---

## 🗺️ Sitemap 与搜索引擎抓取

- **自动生成**：由 `@astrojs/sitemap` 官方集成在每次 `npm run build` 时全自动生成为 `sitemap-index.xml` 与 `sitemap-0.xml`。
- **爬虫指引**：`public/robots.txt` 已配置好指向 `sitemap-index.xml` 的正确绝对路径。
- **规范提示**：**切勿在 `public/` 目录下手动手写或放置 `sitemap.xml`**，避免与官方集成的生成产物发生冲突。

---

## 📦 静态资源分布

- `public/res/`：存放全局公开静态资源（如网站 Logo `/res/img/logo.png`、默认壁纸 `/res/img/wallpaper/default.webp`）。
- `public/unsupported.html`：旧浏览器提示页（`/unsupported.html`）。不走 `BaseLayout`，不进 sitemap。页面说明网站无法正常显示，并提供 Chrome、Edge、Firefox 下载入口和可直接打开的 `/rss.xml` 订阅链接。能正常显示网站的浏览器打开这一页时会自动回到首页。
- `src/content/blog/<slug>/`：文章配套的封面图与正文配图，构建期由 Astro 和 Sharp 自动进行响应式转码与尺寸优化。
