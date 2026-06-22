# 博客列表样式改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/posts` 博客列表页改为双栏瀑布流卡片布局，并支持每篇文章通过 `coverLayout` 控制文字叠在封面（overlay）或单独在封面下方（below）显示，卡片带滚动淡入动画。

**Architecture:** Astro 在构建时读取 markdown frontmatter、估算字数，并把文章数组序列化为 JSON props；新建 `PostCard.vue` 负责渲染两种卡片结构并管理自身的滚动淡入；样式全部写入 `src/styles/article.css` 并复用现有 CSS token；列表容器在 Astro 中用 CSS `columns: 2` 实现真实瀑布流。

**Tech Stack:** Astro 6, Vue 3 (Composition API + `<script setup>`), TypeScript, CSS columns, IntersectionObserver.

---

## 文件结构

- **创建**：`src/components/PostCard.vue` — 单条博客卡片组件，处理 overlay / below 两种布局 + 滚动淡入。
- **修改**：`src/pages/posts/index.astro` — 扩展 frontmatter 类型、增加字数估算、改为 masonry 容器、传 props 给 PostCard。
- **修改**：`src/styles/article.css` — 新增博客列表与卡片样式，复用现有 token。
- **不修改**：`src/lib/runtime-effects.ts`（卡片动画由组件内部 IntersectionObserver 自行触发，复用全局 `.scroll-reveal` CSS 类）。

---

### Task 1: 创建 PostCard.vue 组件

**Files:**
- Create: `src/components/PostCard.vue`

- [ ] **Step 1: 创建单文件组件骨架**

```vue
<script setup lang="ts">
interface PostData {
    title: string;
    description: string;
    cover?: string;
    coverLayout?: 'overlay' | 'below';
    language?: string;
    tags?: string[];
    draft?: boolean;
    pubDate?: string;
    updatedDate?: string;
}

interface PostCardProps {
    slug: string;
    data: PostData;
    dateLabel: string | null;
    wordCount: number;
}

const props = defineProps<PostCardProps>();
const layout = computed(() => props.data.coverLayout || 'below');
const hasCover = computed(() => !!props.data.cover);
</script>

<template>
    ...
</template>
```

- [ ] **Step 2: 实现模板渲染（overlay / below / 无 cover）**

`overlay` 结构：根元素 `.post-card.post-card--overlay.scroll-reveal`，封面 `img` 撑满卡片，底部绝对定位文字区带渐变遮罩。

`below` 结构：根元素 `.post-card.post-card--below.scroll-reveal`，封面在上（`max-height`），`.post-info` 文字块在下。

无 `cover` 时按 `below` 渲染但隐藏封面区。

公共信息区包含：日期 `dateLabel`、字数 `wordCount`、标题 `title`、描述 `description`、标签 `tags`。

- [ ] **Step 3: 添加 IntersectionObserver 滚动淡入**

```ts
const cardRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
    if (!cardRef.value) return;
    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-reveal--visible');
                    observer?.unobserve(entry.target);
                }
            });
        },
        { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 }
    );
    observer.observe(cardRef.value);
});

onUnmounted(() => {
    if (observer && cardRef.value) observer.unobserve(cardRef.value);
    observer?.disconnect();
});
```

模板根元素绑定 `ref="cardRef"`。

- [ ] **Step 4: 格式化并 lint 检查**

Run:
```bash
npm run lint
npm run format:check
```

Expected: 无错误（PostCard.vue 自身无依赖问题）。

---

### Task 2: 修改 posts/index.astro

**Files:**
- Modify: `src/pages/posts/index.astro`

- [ ] **Step 1: 导入 PostCard 组件并扩展 frontmatter 类型**

在 `---` 区域内顶部增加：

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.vue';

interface MarkdownModule {
    frontmatter: {
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
    default: unknown;
    rawContent: () => string;
}
```

- [ ] **Step 2: 增加字数估算函数**

在 `formatDate` 之后添加：

```ts
const countWords = (raw?: string) => {
    if (!raw) return 0;
    const text = raw.trim();
    if (!text) return 0;
    const cnCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enCount = (text.match(/[a-zA-Z0-9_]+/g) || []).length;
    return cnCount + enCount;
};
```

- [ ] **Step 3: 在 map 中调用 rawContent 并附加 wordCount**

```ts
const posts = Object.entries(allPosts)
    .filter(([, mod]) => !mod.frontmatter.draft)
    .map(([filePath, mod]) => {
        const slug = filePath.replace('../../content/blog/', '').replace('/index.md', '');
        return {
            slug,
            data: mod.frontmatter,
            dateLabel: formatDate(mod.frontmatter.pubDate),
            wordCount: countWords(mod.rawContent())
        };
    })
    .sort((a, b) => {
        const da = a.data.pubDate ? new Date(a.data.pubDate).getTime() : 0;
        const db = b.data.pubDate ? new Date(b.data.pubDate).getTime() : 0;
        return db - da;
    });
```

- [ ] **Step 4: 把列表改为 masonry 容器并传入 PostCard**

替换原 `ul.post-list` 渲染：

```astro
<BaseLayout title="博客" shellMode="blog" shellTitle="博客">
    <div class="blog-container">
        <h2 class="blog-title">博客文章</h2>
        <div class="post-list--masonry">
            {
                posts.map((post, index) => (
                    <PostCard
                        client:load
                        slug={post.slug}
                        data={post.data}
                        dateLabel={post.dateLabel}
                        wordCount={post.wordCount}
                    />
                ))
            }
        </div>
        <a href="/" class="back-link">← 返回首页</a>
    </div>
</BaseLayout>
```

- [ ] **Step 5: 清理旧的 `<style>` 内联样式**

删除 `posts/index.astro` 底部的 `<style>` 标签全部内容，样式迁移到 `src/styles/article.css`。

- [ ] **Step 6: lint / format / astro check**

Run:
```bash
npm run lint
npm run format:check
npm run check
```

Expected: 无错误。

---

### Task 3: 在 article.css 中新增博客列表样式

**Files:**
- Modify: `src/styles/article.css`

- [ ] **Step 1: 添加博客列表容器与卡片基础样式**

在文件末尾追加：

```css
/* ===== 博客列表页（双栏瀑布流） ===== */

.blog-container {
    max-width: min(1120px, 100%);
    margin: 0 auto;
    padding: 0 24px 48px;
    color: var(--fg, #0a0a0a);
    font-family: var(--font-ui);
}

.blog-title {
    font-family: var(--font-display, 'Times New Roman', serif);
    font-size: 2rem;
    margin-bottom: 32px;
    text-align: center;
}

.post-list--masonry {
    columns: 2;
    column-gap: 24px;
}

.post-list--masonry .post-card {
    break-inside: avoid;
    margin-bottom: 24px;
    display: block;
    border: 1px solid var(--panel-border);
    background: var(--panel-glass);
    backdrop-filter: var(--panel-blur);
    border-radius: 4px;
    box-shadow: var(--panel-shadow);
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition:
        transform 0.5s var(--curve-delicate),
        box-shadow 0.8s var(--curve-delicate),
        background-color 0.6s ease,
        border-color 0.6s ease;
}

.post-list--masonry .post-card:hover {
    transform: translateY(-4px);
    box-shadow:
        0 15px 35px rgba(0, 0, 0, 0.12),
        0 5px 15px rgba(0, 0, 0, 0.08);
}

[data-theme='dark'] .post-list--masonry .post-card {
    border-color: var(--glass-border);
    background: var(--glass-bg);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 12px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .post-list--masonry .post-card:hover {
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45), 0 5px 15px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 2: 添加 below 布局样式**

```css
.post-card--below .post-cover {
    display: block;
    width: 100%;
    max-height: 260px;
    object-fit: cover;
    border-bottom: 1px solid var(--panel-border);
}

[data-theme='dark'] .post-card--below .post-cover {
    border-bottom-color: var(--glass-border);
}

.post-card .post-info {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.post-card .post-meta {
    font-size: 0.75rem;
    color: var(--muted, #666);
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: center;
    font-family: var(--font-mono);
}

.post-card .post-title {
    font-family: var(--font-display, 'Times New Roman', serif);
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
    margin: 0;
    color: var(--fg);
}

.post-card .post-desc {
    margin: 0;
    color: var(--muted, #666);
    font-size: 0.9rem;
    line-height: 1.5;
}

.post-card .post-tags {
    font-size: 0.75rem;
    color: var(--muted);
    font-family: var(--font-ui);
}
```

- [ ] **Step 3: 添加 overlay 布局样式**

```css
.post-card--overlay {
    position: relative;
    min-height: 220px;
    display: flex;
}

.post-card--overlay .post-cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
}

.post-card--overlay .post-info {
    position: relative;
    z-index: 1;
    margin-top: auto;
    width: 100%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.28) 60%, transparent);
    color: #f5f5f7;
    padding: 48px 16px 16px;
}

.post-card--overlay .post-meta,
.post-card--overlay .post-desc,
.post-card--overlay .post-tags {
    color: #e5e5e7;
}

.post-card--overlay .post-title {
    color: #ffffff;
}

[data-theme='light'] .post-card--overlay .post-info {
    background: linear-gradient(to top, rgba(10, 10, 10, 0.78), rgba(10, 10, 10, 0.35) 60%, transparent);
}
```

- [ ] **Step 4: 添加返回链接与响应式**

```css
.blog-container .back-link {
    display: inline-block;
    margin-top: 32px;
    text-decoration: none;
    color: inherit;
    font-weight: 600;
}

.blog-container .back-link:hover {
    text-decoration: underline;
}

@media (max-width: 768px) {
    .post-list--masonry {
        columns: 1;
    }

    .blog-container {
        padding: 0 16px 40px;
    }

    .blog-title {
        font-size: 1.75rem;
    }
}
```

- [ ] **Step 5: 格式化检查**

Run:
```bash
npm run format:check
```

Expected: 无错误。

---

### Task 4: 构建与预览验证

**Files:**
- 不涉及具体文件修改，纯验证步骤。

- [ ] **Step 1: 静态构建**

Run:
```bash
npm run build
```

Expected: 构建成功，`dist/` 目录生成。

- [ ] **Step 2: 本地预览**

Run:
```bash
npm run preview
```

在浏览器打开 `http://localhost:4321/posts`，验证：

- 双栏瀑布流布局生效。
- `coverLayout: overlay` 卡片文字压在封面底部渐变上。
- `coverLayout: below` 卡片文字在封面下方单独显示。
- 无 `cover` 的文章显示为纯文字卡片。
- 滚动时卡片有淡入/上移动画。
- 暗色/浅色主题切换正常。
- 移动端宽度 <= 768px 时变为单列。

- [ ] **Step 3: 在示例文章中临时测试两种 coverLayout**

任选两篇 markdown（如 `src/content/blog/hello-world/index.md` 和 `src/content/blog/huaxue/index.md`），分别添加：

```yaml
coverLayout: overlay
# 或
coverLayout: below
```

重新 `npm run build` + `npm run preview` 验证效果。验证结束后可还原或保留（若用户希望保留）。

- [ ] **Step 4: 运行完整验证链路**

Run:
```bash
npm run lint
npm run format:check
npm run check
npm run build
```

Expected: 全部通过。

---

### Task 5: 更新 AGENTS.md（如样式约定有变）

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: 在「组件一览」中补充 `PostCard.vue`**

在 `HomepageApp.vue` 之后或合适位置增加一行：

```markdown
- `PostCard.vue`：博客列表卡片组件，支持 `coverLayout` 的 overlay/below 两种布局，内部管理滚动淡入动画。
```

- [ ] **Step 2: 在「配置链路」或「新增配置字段」段落补充博客 frontmatter 扩展说明**

例如：

```markdown
博客文章 frontmatter 新增字段：同步改 `src/pages/posts/index.astro` 的 `MarkdownModule` 接口。
```

- [ ] **Step 3: lint / format 检查**

Run:
```bash
npm run lint
npm run format:check
```

Expected: 通过。

---

## 自审检查

- **Spec coverage**：设计文档中所有需求均对应到任务：双栏瀑布流（Task 3 Step 1）、`coverLayout` 两种布局（Task 1 Step 2）、无 cover 退化（Task 1 Step 2）、自动字数统计（Task 2 Step 2-3）、Vue 组件增强（Task 1）、样式复用现有 token（Task 3）、滚动动画（Task 1 Step 3 + Task 3 CSS）、响应式（Task 3 Step 4）。
- **Placeholder scan**：无 TBD/TODO/"implement later"，每步均含具体代码或命令。
- **Type consistency**：`coverLayout?: 'overlay' | 'below'` 在 `PostCard.vue` props、Astro `MarkdownModule`、设计文档中一致；`wordCount` 字段在 Astro map 与 PostCard props 中一致。
