# 博客列表样式改造设计文档

## 背景与目标

当前 `/posts` 博客列表页为单列横向卡片布局（左侧小封面 + 右侧文字信息）。参考用户截图，需要改为：

- 双栏真实瀑布流卡片布局。
- 每篇文章支持通过 frontmatter 控制封面与文字的相对位置：
  - `coverLayout: overlay` — 标题/描述/日期压在封面图上（底部暗色渐变遮罩）。
  - `coverLayout: below`（默认）— 封面在上，文字信息单独在下。
- 无 `cover` 的文章退化为纯文字卡片。
- 复用项目现有 CSS token，保持暗色/浅色主题一致。
- 卡片进入视口时带有淡入/上移动画。

## 方案选择

| 维度 | 选择 |
|---|---|
| 整体技术方案 | B：Vue 组件 + CSS columns + 客户端增强 |
| Vue 组件范围 | A：只做 `PostCard.vue`，Astro 保留列表容器与瀑布流布局 |
| 数据传递 | A：Astro 在构建时通过 JSON props 把文章数组传给 `PostCard` |
| 动画增强 | B：复用项目已有 scroll-reveal 能力，给卡片加淡入/上移效果 |
| 图片比例 | C：不固定，由图片原始比例决定，容器加 `max-height` 防过高 |
| 字数统计 | B：构建时读取 markdown raw content 自动估算字数 |

未采用纯 Astro 方案 A 的原因：用户明确要求客户端增强的可扩展性；未采用方案 C 的原因：手动两列分配无法产生真实瀑布流的错落效果。

## 数据字段变更

新增博客 frontmatter 字段（仅扩展 `src/pages/posts/index.astro` 内的 `MarkdownModule` 接口，暂不进入站点级 Zod schema）：

```yaml
coverLayout: overlay   # 可选：overlay | below，默认 below
```

构建时衍生的字段：

```ts
{
  slug: string;
  data: {
    title: string;
    description: string;
    cover?: string;
    coverLayout?: 'overlay' | 'below';
    language?: string;
    tags?: string[];
    draft?: boolean;
    pubDate?: string;
    updatedDate?: string;
  };
  dateLabel: string | null;
  wordCount: number;      // 新增：构建时估算
}
```

## 组件与文件变更

1. `src/components/PostCard.vue`
   - Props：`post`（包含 `slug`, `data`, `dateLabel`, `wordCount`）。
   - 根据 `coverLayout` 渲染两套 DOM：
     - `overlay`：封面作为卡片背景，文字绝对定位在底部，加渐变遮罩。
     - `below`（及无 cover）：封面在上（`max-height`），文字信息块在下。
   - 内部使用项目 `Icon.vue` 或纯文本展示日期、字数、标签。
   - 卡片整体带 `.post-card`、`.post-card--overlay` / `.post-card--below` 类，方便 CSS 命中。

2. `src/pages/posts/index.astro`
   - 扩展 `MarkdownModule` 接口增加 `coverLayout?: 'overlay' | 'below'`。
   - 增加字数估算函数（按中文字符/英文单词简单统计）。
   - 将 `posts` 数组序列化为 JSON 传给 `PostCard.vue`。
   - 列表容器由 `ul/li` 改为 `div.post-list--masonry`，使用 CSS `columns: 2` + `column-gap` + `break-inside: avoid`。
   - 样式从 `<style>` 内联迁移/补充到 `src/styles/article.css` 或保留在页面内（视复杂度而定）。

3. `src/styles/article.css`
   - 新增 `.post-list--masonry`、`.post-card`、`.post-card--overlay`、`.post-card--below`、`.post-cover`、`.post-info` 等规则。
   - 全部使用 `--panel-glass` / `--glass-bg`、边框、阴影、模糊等现有 token，避免硬编码颜色。
   - 增加 `@media (max-width: ...)` 移动端单列。

4. `src/lib/runtime-effects.ts`
   - 确保博客列表页选择器能命中 `.post-card` 并正确触发 scroll-reveal；若当前实现只按 `.scroll-reveal` 类工作，则在 `PostCard.vue` 给根元素加 `.scroll-reveal`。

## 交互与动画

- `PostCard.vue` 根元素默认带 `class="post-card scroll-reveal"`，复用 `runtime-effects.ts` 的 IntersectionObserver 逻辑。
- 若 scroll-reveal 在列表页未自动初始化（因为 `astro:page-load` 事件在列表页同样触发），需确认脚本已加载。`BaseLayout.astro` 已全局引入 `runtime-effects.ts`，预计无需额外改动。

## 响应式

- 桌面：双栏瀑布流。
- 平板/移动端：单列（通过 `@media` 改 `columns: 1`）。

## 暗色/浅色主题

- 所有颜色使用 CSS token；`[data-theme='dark']` 下自动切换。
- `overlay` 卡片的底部渐变遮罩在暗色主题下使用深色渐变，浅色主题下使用浅色渐变，确保文字可读。

## 边界情况

- 无 `cover` 的文章：按 `below` 渲染，去掉封面区，保留完整文字信息。
- `cover` 图片加载失败：图片使用 `object-fit: cover`，无额外兜底样式，保持卡片结构。
- 单篇文章：瀑布流自动退化为单列，无需特殊处理。
- 字数统计：按原始 markdown 字符串统计（不含 frontmatter）。中文字符每个字符计 1，连续英文按单词计 1（简单实现）。

## 不做的范围

- 不在站点级 `siteConfig` / Zod schema 中新增配置。
- 不做客户端按标签/日期筛选、搜索、分页。
- 不改文章详情页 `/posts/[...slug].astro`。
- 不改动首页 `HomepageApp.vue`（未来可把 `PostCard.vue` 复用过去，但本次不做）。

## 验证计划

1. 运行 `npm run lint` 无错误。
2. 运行 `npm run format:check` 无错误。
3. 运行 `npm run check`（astro check）通过。
4. 运行 `npm run build` 成功生成静态站点。
5. 本地预览 `/posts`，确认双栏瀑布流、`overlay`/`below` 两种卡片样式正常，动画生效，移动端单列正常。
