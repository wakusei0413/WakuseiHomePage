# 博客与内容创作指南 (Content Guide)

本项目使用 Astro 7 推荐的 **Content Collections**（内容集合）管理全部博客文章。所有文章均通过严格的 TypeScript + Zod 模式校验，确保排版一致与 SEO 规范。

---

## 🚀 3 步写一篇新文章（新手入门）

### 第一步：创建文章目录

在 `src/content/blog/` 目录下新建一个文件夹，文件夹名称即为文章的链接标识（slug，推荐使用纯小写英文、数字和短横线，例如 `hello-world` 或 `learning-astro`）。

### 第二步：放置封面与编写文章

在新建的文件夹内：

1. 放入封面图片：例如 `cover.webp` 或 `cover.jpg`。
2. 新建正文文件：`index.md`。

### 第三步：编写 Frontmatter 头信息

打开 `index.md`，在文件最顶部添加文章元数据（Frontmatter），随后直接用标准 Markdown 撰写正文。

---

## 📝 标准文章模板

以下是功能最齐备的文章模板，你可以直接复制使用：

````markdown
---
title: '这是文章的标题'
description: '这是文章的摘要，用于在首页卡片和搜索结果中显示，对 SEO 极为关键。'
cover: './cover.webp'
coverLayout: overlay
category: '技术'
tags: ['Astro', 'Vue', '前端开发']
language: 'zh-CN'
pubDate: '2026-09-20'
updatedDate: '2026-09-21'
author:
    name: '你的名字'
    url: 'https://example.com'
draft: false
---

## 1. 前言

正文内容直接使用 Markdown 撰写。

### 1.1 标题层级

系统会自动解析 `##`、`###` 等标题，并在文章右侧自动生成可点击的**目录树（TOC）**。

### 1.2 代码块与一键复制

代码块会自动加上语言标记与**一键复制按钮**：

```typescript
const greeting = 'Hello, Wakusei HomePage 2.0!';
console.log(greeting);
```
````

### 1.3 图片灯箱

正文中插入的任何图片，读者点击后都会自动弹出**全屏灯箱画廊**，支持高清放大查看。

![示意图](./cover.webp)

````

---

## 🏷️ Frontmatter 字段详解

| 字段 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| `title` | `string` | **必填** | 文章标题 |
| `description` | `string` | **必填** | 文章摘要。用于首页卡片和搜索引擎摘要，请写真实概述，不要留空或写第一行正文 |
| `pubDate` | `string` | **必填** | 发布日期，格式为 `YYYY-MM-DD`。列表严格按发布日期从新到旧排序 |
| `cover` | `image` | 可选 | 封面图相对路径（如 `./cover.webp`）。放在同级目录下可享受 Sharp 自动压缩与优化 |
| `coverLayout` | `'overlay' \| 'below'` | 可选 | 封面展示布局：`overlay`（标题文字浮在封面上，默认推荐）或 `below`（封面位于标题下方） |
| `category` | `string` | 可选 | 文章主分类，如 `'技术'`、`'随笔'`、`'生活'` |
| `tags` | `string[]` | 可选 | 标签列表，如 `['Astro', 'Vue']` |
| `author` | `{ name, url? }` | 可选 | 覆盖作者信息。转载或外包文章可填写真实作者，默认继承站点 profile |
| `repost` | `true \| { source?, url?, author? }` | 可选 | 标记**转载**文章，不写即为原创。见下方「原创与转载」 |
| `updatedDate` | `string` | 可选 | 最后修订日期，填入后文章顶部将显示“更新于 YYYY-MM-DD” |
| `language` | `string` | 可选 | **原文语言**标识，如 `'zh-CN'`、`'en'`、`'ja'`（默认 `'zh-CN'`）。只写在 `index.md` 上；译文的语言由文件名决定 |
| `comments` | `boolean` | 可选 | 设为 `false` 时关闭这篇文章的评论区（译文沿用原文设置）。全站开关见 [comments.md](comments.md) |
| `draft` | `boolean` | 可选 | 设为 `true` 时视为草稿，文章**绝不会**出现在首页列表、分类、搜索和 RSS 订阅中 |

### 原创与转载

文章默认都是原创。转载的文章加上 `repost` 字段：

```yaml
repost:
  source: '日本语能力测试 JLPT 官网'   # 原文出处名称
  url: 'https://www.jlpt.jp/cn/about/levelsummary.html'  # 原文链接
  author: '原作者姓名'                  # 可选
````

三个子字段都可省略；出处未知时直接写 `repost: true`。只填 `url` 时，出处名称显示为链接的域名。

- 首页、分类/标签页、搜索结果和归档里的文章条目会带上「转载」标记。
- 文章标题下方显示出处说明，例如「本文转载自 _日本语能力测试 JLPT 官网_，版权归原作者所有。」，出处带原文链接。
- 有 `url` 时，结构化数据（BlogPosting）会写入 `isBasedOn` 指向原文。
- 不需要再在标题里手写「【转载】」。
- 译文不用重复写 `repost`，会沿用 `index.md` 的设置；译文自己写了则以译文为准（例如给出处换成当地语言的名称）。

---

## 🌍 给文章写译文（多语言正文）

一篇文章的目录里，`index.md` 是**原文**，同级的 `index.<语种>.md` 就是它的**译文**：

```
src/content/blog/hello-world/
├── index.md          # 原文（语言由 frontmatter 的 language 决定，默认 zh-CN）
├── index.en.md       # 英文译文 → /en/posts/hello-world
├── index.ja.md       # 日文译文 → /ja/posts/hello-world
└── cover.webp        # 封面与配图由同目录下所有语种共用
```

译文是一份完整的文章：自己的 `title`、`description`、`category`、`tags`、`pubDate`，正文也独立撰写。写好保存即可，不需要改任何配置。

### 规则速查

| 情况                                | 结果                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 某语种**有**译文                    | 该语种路由下显示译文，`<html lang>`、`og:locale`、结构化数据均为该语种，并与其他语种互相声明 `hreflang`                                                                        |
| 某语种**没有**译文                  | 该语种路由仍可访问，显示原文，并在标题下方提示「本文暂无译文，显示原文」；`<html lang>` 如实标注原文语言，`canonical` 指回原文地址，**不进 sitemap**，也不会被当成译文对外声明 |
| `index.md` 里 `draft: true`         | 整篇文章下架，所有语种都不发布                                                                                                                                                 |
| 只有 `index.en.md` 是 `draft: true` | 仅这一份译文不发布，英文路由回落到原文                                                                                                                                         |
| 只有译文、没有 `index.md`           | 按语种顺序取第一份作为原文，其余仍作译文                                                                                                                                       |

### 译文会影响的地方

分类、标签、归档、首页列表、搜索索引（`/en/search-index.json`）和订阅源（`/en/rss.xml`、`/ja/atom.xml`）都按语种各出一份。也就是说，译文里写 `category: 'Tech'`，英文站的分类页就会出现 `Tech`，中文站不受影响。

> 原文语言不是中文时，在 `index.md` 里写 `language: 'en'`，中文路由就会显示「暂无译文」并把 `canonical` 指向 `/en/posts/...`。

---

## 📖 2.0.0 前台阅读器专属特性

发布文章后，读者在阅读你的文章时将自动享有以下贴心体验：

1. **阅读控制面板（Floating Controls）**：
    - 读者可以在文章右下角点击控制面板，自主调节**字体大小（多档缩放，基准 110%）**与**排版宽度（紧凑 / 舒适 / 宽松）**。
    - 支持一键开启**沉浸式全屏阅读**，自动隐去干扰元素。
2. **纯色高对比度大纲（TOC）**：
    - 右侧悬浮目录采用纯色背景遮罩，滚动页面时自动高亮当前阅读位置，点击目录项可平滑滚动定位。
3. **顶部细致阅读进度条**：
    - 随着文章向下滚动，页面最顶端会有一条细腻的进度条展示当前已阅读的百分比。
4. **一键代码复制与智能回退**：
    - 代码块右上角内置复制按钮，支持现代 Clipboard API 与多浏览器兼容回退。

---

## ⚠️ 开发者注意：服务端模块 vs 客户端模块隔离

- **服务端加载器**：`src/lib/posts.ts` 负责调用 Astro 底层的 `getCollection`、Sharp `getImage` 和 Markdown `render`。**绝对不能从 Vue island 组件中直接导入 `posts.ts`**，否则会导致构建失败（`ServerOnlyModule` 报错）。
- **客户端安全模型**：Vue 组件和客户端脚本请统一从 `src/lib/post-model.ts`、`src/lib/archive.ts`、`src/lib/search.ts` 和 `src/lib/post-locale.ts` 导入纯数据类型与纯计算函数。
- **搜索索引**：前台搜索弹窗通过异步读取构建时生成的 `/search-index.json` 实现即时搜索，不增加首屏体积；非默认语种读取 `/<语种>/search-index.json`。
- **多语言解析**：`src/lib/post-locale.ts` 负责把内容集合里扁平的 `<slug>` / `<slug>@<语种>` 条目还原成「原文 + 译文」分组，并为指定语种挑出要渲染的那一份；它是纯函数，不碰 `astro:content`，可直接单元测试。`posts.ts` 里所有加载器都接受一个 `locale` 参数并按语种分别缓存。
