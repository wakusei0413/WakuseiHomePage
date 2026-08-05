# AGENTS

Astro 7 **静态站点** + Vue 3（`<script setup>`）+ Pinia + TypeScript。Node `>=22.12.0`。

**以本文件 + `package.json` / `astro.config.mjs` / CI / README 为准。**

## 命令

```bash
npm run dev          # localhost:4321
npm run build        # → dist/
npm run serve        # 静态预览 dist/
npm run preview      # astro preview
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run check        # astro check
npm test             # vitest run (jsdom)
npm test -- tests/foo.test.ts   # 单文件测试
```

完工前按 CI 顺序跑：`lint → format:check → test → check → build`。

## 红线（违反会破坏构建/设计）

- 站内导航用 `astro:transitions/client` 的 `navigate`；**不要**重新引入 `@swup/astro`。
- **不要**从 Vue island 导入 `src/lib/posts.ts`（构建失败）；客户端用 `src/lib/post-model.ts` 等。
- 封面在文章旁边（`./cover.*`），**不是** `public/` 路径。
- **不要**手写 `public/sitemap.xml`（由 `@astrojs/sitemap` 生成）。
- Dock"设置"是占位——没被要求就别发明设置 UI。

## 详情按需读取（索引：[docs/README.md](docs/README.md)）

| 主题 | 文档 | 含什么 |
|------|------|--------|
| 架构 | [architecture.md](docs/architecture.md) | Shell props 驱动、Islands 默认 `client:idle`、Pinia、跨页状态、客户端助手 |
| 配置链 | [configuration.md](docs/configuration.md) | 日常只改 `customize.ts`、新字段/新语言改哪几处、壁纸、主题 |
| 内容 | [content.md](docs/content.md) | frontmatter 字段、`description` 必填、排序、`draft`、封面规则 |
| 路由 | [routes.md](docs/routes.md) | 路径表、静态资源、Sitemap |
| CSS | [css.md](docs/css.md) | `BaseLayout` 导入顺序即加载顺序、设计令牌 |
| 卫生 | [hygiene.md](docs/hygiene.md) | gitignore 清单、别提交截图/Lighthouse |

## 代码风格

Prettier：4 空格、单引号、分号、`printWidth: 120`、`trailingComma: "none"`（覆盖 `.astro` + CSS）。ESLint 覆盖 `src/**/*.{ts,vue}`、`tests/**/*.test.ts`、`astro.config.mjs`（**不含** `.astro` 模板体）。
