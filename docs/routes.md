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

### 多语言路由

默认语种 `zh-CN` 不带前缀；`en` 与 `ja` 在 `src/pages/[locale]/` 下镜像出完整的一套页面（首页、分页、文章、归档、分类、标签、专题、搜索），路径形如 `/en/archives`、`/ja/posts/[...slug]`。

每个语种的文章集合都独立解析：有 `index.<语种>.md` 译文就用译文，没有就回落到原文（详见 `docs/content.md`）。因此分类名、标签名、列表标题与搜索结果都会随语种变化。

---

## 📡 静态数据与订阅端点 (API & Feeds)

| 端点路径 | 对应生成源 | 说明 |
|---|---|---|
| `/rss.xml` | `src/pages/rss.xml.ts` | 标准 RSS 2.0 订阅源，自动包含全部非草稿文章 |
| `/atom.xml` | `src/pages/atom.xml.ts` | Atom 1.0 格式订阅源 |
| `/search-index.json` | `src/pages/search-index.json.ts` | 客户端毫秒级搜索索引文件，包含文章标题、摘要、分类与标签 |
| `/github-contributions.json` | `src/pages/github-contributions.json.ts` | GitHub 53 周提交热力图数据快照（构建期由服务端抓取并转为静态 JSON） |
| `/featured-posts.json` | `src/pages/featured-posts.json.ts` | 站点精选/置顶文章静态 JSON 数据 |
| `/twikoo/locales/[name].js` | `src/pages/twikoo/locales/[name].js.ts` | 开启评论时，构建期从 `node_modules/twikoo` 复制 Twikoo 不内置的界面语言包（目前是 `ja-JP`），见 `docs/comments.md` |
| `/og-default.jpg` | `src/pages/og-default.jpg.ts` | 构建期用 Sharp 把默认壁纸裁成 1200×630 的社交分享卡，供没有独立封面的页面作为 `og:image` 使用 |
| `/[locale]/rss.xml` | `src/pages/[locale]/rss.xml.ts` | 各语种 RSS 订阅源（`/en/rss.xml`、`/ja/rss.xml`），条目链接带语种前缀，标题与摘要取该语种的文章版本 |
| `/[locale]/atom.xml` | `src/pages/[locale]/atom.xml.ts` | 各语种 Atom 订阅源 |
| `/[locale]/search-index.json` | `src/pages/[locale]/search-index.json.ts` | 各语种搜索索引；前台按当前路由语种读取对应文件 |

---

## 🗺️ Sitemap 与搜索引擎抓取

- **自动生成**：由 `@astrojs/sitemap` 官方集成在每次 `npm run build` 时全自动生成为 `sitemap-index.xml` 与 `sitemap-0.xml`。
- **爬虫指引**：`public/robots.txt` 已配置好指向 `sitemap-index.xml` 的正确绝对路径。
- **规范提示**：**切勿在 `public/` 目录下手动手写或放置 `sitemap.xml`**，避免与官方集成的生成产物发生冲突。
- **多语言**：集成开启了 `i18n` 选项，同一页面的各语种 URL 会互相生成 `<xhtml:link rel="alternate">`。`astro.config.mjs` 的 `filter` 会剔除**没有译文的语种文章页**——这些页面只是原文的副本，已 `canonical` 指回原文，不应重复提交。
- **lastmod**：文章 URL 取各自语种文件的 `updatedDate` / `pubDate`；聚合页统一取全站最新修改时间。

---

## 📦 静态资源分布

- `public/res/`：存放全局公开静态资源（如网站 Logo `/res/img/logo.png`、默认壁纸 `/res/img/wallpaper/default.webp`）。
- `public/unsupported.html`：旧浏览器提示页（`/unsupported.html`）。不走 `BaseLayout`，不进 sitemap。页面说明网站无法正常显示，并提供 Chrome、Edge、Firefox 下载入口和可直接打开的 `/rss.xml` 订阅链接。能正常显示网站的浏览器打开这一页时会自动回到首页。
- `src/content/blog/<slug>/`：文章配套的封面图与正文配图，构建期由 Astro 和 Sharp 自动进行响应式转码与尺寸优化。
