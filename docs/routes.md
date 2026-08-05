# 路由

| 路径 | 说明 |
|------|--------|
| `/` | 首页 + 文章列表（`#posts`） |
| `/posts/[...slug]` | 文章页（`shellMode="article"`） |
| `/archives`、`/topics`、`/categories`、`/tags`、`/search` | 博客 shell |
| `/rss.xml`、`/atom.xml` | Feed |
| `/search-index.json` | 客户端搜索索引（构建时生成） |
| `/404` | `shellMode="error"` |

## 静态资源

- `public/res/`。

## Sitemap

- `@astrojs/sitemap` → `sitemap-index.xml` / `sitemap-0.xml`。
- `robots.txt` 指向索引。
- **不要**再手写 `public/sitemap.xml`。
