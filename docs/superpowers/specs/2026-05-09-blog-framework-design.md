# Blog Framework Design

> 状态：草案 | 日期：2026-05-09

## 目标

将现有单页 Astro 静态站点扩展为带博客功能的开源框架，保持 UI 差异化，架构上参考 Fuwari 等成功项目的实践。

## 当前项目基线

- Astro 6 纯静态（SSG）+ SolidJS + TypeScript
- 仅2个路由：`/`（首页）、`/*`（404）
- 零内容集合，`src/content/` 不存在
- `customize.ts` → `schema.ts`（Zod 校验）→ `site.ts` → 组件消费的配置链路
- 社交链接中博客指向外站 `https://blog.wakusei.top/`

## 架构层 —— 学 Fuwari 们做对的事

### Content Collections

使用 Astro Content Collections 管理文章：

- 目录：`src/content/blog/`
- 每篇文章一个子文件夹，`.md` 文件 + 相关图片放在一起
- Zod Schema 定义元数据结构，类型自动推导

### 文章元数据 Schema（初稿）

```ts
interface BlogPost {
  title: string;          // 标题
  pubDate: Date;          // 发布日期
  updateDate?: Date;      // 更新日期
  description: string;    // 摘要
  cover: string;          // 封面图（本地路径或完整URL）
  language: Locale;       // 'zh-CN' | 'en' | 'ja'
  tags?: string[];        // 标签
  draft?: boolean;        // 草稿（构建时排除）
  // 字数/阅读时间通过脚本自动计算，无需手填
}
```

### 主题/标签

- 暂定为简单的字符串标签（`tags: string[]`）
- 暂不做标签详情页，后续迭代

## 表现层 —— 做自己的 UI

### 导航栏行为（已有设想，先搭框架后加动画）

1. **主页初始状态**：左栏 profile（头像+姓名+打字机），右栏壁纸
2. **向下滚动**：左边头像姓名压缩成一行置顶导航栏，丝滑过渡。右侧保持不变
3. **往下继续滚**：导航栏半隐藏，露一条缝，hover 弹出。向上滚时浮现
4. **点击头像+名字**：返回主页
5. **移动端**：保持现有侧边栏弹窗逻辑

### 页面结构

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 | 现有 Profile + 下方新增"最新5篇"横向推荐区（自动滚动）+ 自我介绍/炫酷名片区 |
| `/posts` | 博客列表 | 所有文章网格布局，错落排列，大封面 + 元数据（日期、字数、标签） |
| `/posts/[slug]` | 文章详情 | Markdown 渲染的阅读页，保留顶部导航栏 |
| `/*` | 404 | 保持现有 |

### 未来"炫酷区"（迭代2，本次不做）

- 3D 模型（Spline / Three.js）
- 动态交互效果
- 横向自动滚动文章卡片（Intersection Observer + CSS scroll-snap）

## 图片方案

### 策略：本地优先 + 预留 CDN 退路

1. **默认本地存储**：图片放在文章文件夹内，`src/content/blog/文章名/image.png`
2. **构建时优化**：利用 Astro `<Image />` 组件自动压缩、转换 WebP/AVIF、生成响应式尺寸
3. **兼容外部 URL**：封面图和正文图片同时支持网络链接
4. **防仓库膨胀**：后续可选加入 Git Hook 自动压缩、Git LFS，或在 `customize.ts` 中增加 `imageSource: 'local' | 'cdn'` 开关
5. **写作体验**：VSCode 中直接拖拽图片到文章文件夹，Markdown 用相对路径引用

## i18n

- 已有 zh-CN / en / ja 三语支持
- 每篇文章标记 `language` 字段
- 博客列表可按语言过滤
- UI 文本（"阅读时间"、"返回首页"等）沿用现有 `src/data/i18n.ts` 模式

## RSS / Sitemap

- `@astrojs/sitemap` 已安装，需配置启用
- 新增 `@astrojs/rss` 生成 RSS feed

## 配置链路

在现有 `customize.ts` → `site.ts` 流程中新增博客配置：

```ts
// customize.ts 新增
blog: {
  postsPerPage: 10,
  showWordCount: true,
  autoWordCount: true,    // 构建时自动计算字数
}
```

## 组件分工（初步）

| 组件 | 职责 |
|------|------|
| `PostCard.tsx` | 文章卡片：封面、标题、日期、字数、标签 |
| `BlogHeader.tsx` | 置顶导航栏（先基础样式，后加动画） |
| `PostGrid.astro` | 博客列表页的网格/瀑布流布局 |
| `PostLayout.astro` | 文章详情页的阅读布局 |
| `LatestPosts.tsx` | 首页"最新5篇"横向推荐区 |

## 包依赖新增

- `@astrojs/rss` — RSS feed 生成
- 图像处理：Astro 内置 `@astrojs/image`（无需额外安装）

## 暂不做的

- 评论系统
- 搜索
- 标签详情页
- 分页
- 3D 效果 / Spline 集成
- 导航栏复杂动画（先跑通基础功能）
