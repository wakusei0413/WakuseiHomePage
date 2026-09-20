# Wakusei HomePage

![Version](https://img.shields.io/badge/version-2.0.0-9a0a0a?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-ffe600?style=for-the-badge)
![Astro](https://img.shields.io/badge/Astro-7-ff5d01?style=for-the-badge&logo=astro&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-42b883?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-static-f38020?style=for-the-badge&logo=cloudflarepages&logoColor=white)

Wakusei HomePage 是一个专为个人开发者、博主和技术爱好者打造的**高颜值、极致流畅、开箱即用**的现代化静态个人主页与博客模板。

基于 **Astro 7 + Vue 3 + Pinia + TypeScript** 构建，兼具原生 App 般的丝滑切页质感与静态站点的极速加载体验，无需服务器，可零成本一键部署至 Cloudflare Pages、Vercel 等平台。

![主页截图](docs/assets/screenshots/homepage-01.png)

---

## ✨ 核心亮点

- 🚀 **像原生 App 一样丝滑**：基于 Astro 原生 View Transitions 深度调优，页面跳转不白屏、不闪烁，背景与常驻顶栏跨页无缝衔接。
- 📖 **超贴心的长文阅读器**：
  - 支持**字号多档缩放**与**版面宽度自由调节**，适应不同屏幕与阅读习惯。
  - 支持**一键沉浸阅读**与深浅模式自由切换，专注内容本身。
  - 纯色高对比度悬浮**目录（TOC）**，滚动自动高亮当前章节；内置图片点击灯箱与代码一键复制。
- 🖼️ **会呼吸的动态壁纸**：
  - 支持本地高清壁纸，也支持接入必应或第三方壁纸 API 自动轮播。
  - 搭载 Web Animations 电影级 Ken Burns 呼吸缩放微动效，切页时缩放相位平滑接管无跳变。
- 🔍 **顺手好用的即时搜索**：全局快捷键唤出，毫秒级响应；支持键盘 `↑` `↓` `Enter` `Esc` 全流程操作，手机端大触控区防误触。
- 📊 **GitHub 动态贡献热力图**：构建期自动抓取 53 周提交矩阵，无需配置个人 Token，在首页展示你的极客贡献轨迹，离线或接口异常时优雅降级。
- 🌗 **双色主题 & 三语国际化**：预设精致的深色与浅色模式，首屏内联脚本防闪烁；内置简体中文、英语、日语（`zh-CN` / `en` / `ja`）随时切换。
- 📱 **全平台响应式 & 无障碍优化**：移动端专属抽屉导航、严格遵循 WCAG 交互触控热区与高对比度规范，全面支持系统级“减少动态效果（prefers-reduced-motion）”。
- ⚡ **首屏秒开**：无任何阻塞式全屏 Loading 菊花遮罩，首屏内容与标语瞬间呈现。

---

## 🟢 3 分钟快速上手

### 1. 准备环境

确保电脑已安装 **Node.js**（推荐 `>= 22.12.0`）及 npm。可在终端运行 `node -v` 查看版本。

### 2. 获取代码与安装

```bash
# 克隆项目到本地
git clone https://github.com/wakusei0413/WakuseiHomePage.git
cd WakuseiHomePage

# 安装依赖
npm install
```

### 3. 启动本地预览

```bash
npm run dev
```

终端会输出本地预览地址：`http://localhost:4321`，在浏览器打开即可实时查看效果。

---

## 🎨 怎么改成我的个人主页？

**你不需要改动复杂的页面代码！** 所有的个人信息、文案、链接、壁纸与导航，都统一存放在一个文件：

👉 **`src/data/customize.ts`**

打开该文件，里面有极其详尽的中文注释，按需修改以下内容即可：

| 想修改的内容 | 对应字段 | 说明与示例 |
|---|---|---|
| **网站名称与描述** | `title` / `description` | 浏览器标签页标题与搜索引擎描述（SEO） |
| **个人信息与头像** | `profile` | `name`（昵称）、`avatar`（头像路径，如 `/res/img/logo.png`）、`status`（状态） |
| **首页跑马灯标语** | `slogans` | `list: ['第一句', '第二句']`，支持按顺序或随机播放，支持自定义停留时长 |
| **社交媒体按钮** | `socialLinks` | GitHub、Bilibili、X、邮箱等链接与图标颜色，可自由增删 |
| **壁纸设置** | `wallpaper` | `defaultImage`（默认本地壁纸）、`apis`（壁纸轮播接口）、`rotation`（轮播间隔） |
| **GitHub 贡献图** | `github` | 填入你的 `username`，首页自动生成提交绿格子；`url` 填你的主页链接 |
| **顶栏导航按钮** | `dock.items` | 支持页面链接、内置功能（搜索、主题切换、语言选择）与分割线 |
| **页脚信息** | `footer` | 备案号、版权声明文字等 |

> 💡 **更换默认壁纸**：直接将你的 WebP 格式图片覆盖保存到 `public/res/img/wallpaper/default.webp` 即可。

---

## 📝 如何写一篇新博客？

文章以 Markdown 格式保存在 `src/content/blog/` 目录下：

### 1. 创建文章目录

在 `src/content/blog/` 下新建一个文件夹（例如 `my-first-post`），在里面放入：
- `index.md`（文章正文）
- `cover.webp`（可选：文章封面图，放在文章同一目录下以便自动压缩优化）

### 2. 编写 Frontmatter 头信息

在 `index.md` 顶部添加如下配置：

```markdown
---
title: '我的第一篇博客'
description: '这是文章的摘要，会显示在博客列表卡片以及搜索引擎结果中。'
cover: './cover.webp'       # 文章封面，推荐相对路径
coverLayout: overlay        # 封面样式：overlay（文字覆盖在封面上）或 below（封面在文字下方）
category: '生活'            # 分类
tags: ['随笔', '生活']       # 标签列表
language: 'zh-CN'           # 文章语言
pubDate: '2026-09-20'       # 发布日期（必填，格式 YYYY-MM-DD）
updatedDate: '2026-09-21'   # 更新日期（可选）
author:                     # 作者信息（可选，默认使用站点作者）
  name: '你的名字'
  url: 'https://example.com'
draft: false                # 是否为草稿（设为 true 则不会在任何列表和搜索中显示）
---

这里开始写 Markdown 正文内容…
```

保存后，本地开发服务器会自动刷新，在首页文章列表中就能看到刚刚发布的文章！

---

## ☁️ 免费发布上线（Cloudflare Pages 推荐）

本项目为纯静态站点，推荐部署在 **Cloudflare Pages**（全球 CDN 加速、无限流量、自动配置 HTTPS、完全免费）：

1. 将你的代码推送到你的 GitHub 个人仓库。
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers 与 Pages** > **创建应用程序** > **Pages** > **连接到 Git**。
3. 选中你的 GitHub 仓库，在构建设置中填写：
   - **框架预设**：`Astro`
   - **构建命令**：`npm run build`
   - **构建输出目录**：`dist`
   - **环境变量**（可选推荐）：添加 `NODE_VERSION`，值设为 `22.12.0`。
4. 点击 **保存并部署**，几分钟后即完成部署，并获得专属的 `*.pages.dev` 访问域名。

---

## 🛠️ 开发者进阶指南

### 技术栈构成

| 模块 | 选型 | 说明 |
|---|---|---|
| **核心框架** | Astro 7 | 静态站点生成（`output: 'static'`），高性能 HTML 优先 |
| **交互组件** | Vue 3 + Pinia | `<script setup>` 组合式 API + Pinia 状态管理，多岛屿运行时单例去重 |
| **内容管理** | Astro Content Collections + Zod | 严格类型校验与 Schema 约束 |
| **样式体系** | 手写现代化原生 CSS | CSS 变量设计令牌（`--panel-*`, `--glass-*`）、3D Lift 微浮动动效 |
| **代码质量** | ESLint + Prettier + Vitest | jsdom 单元测试覆盖核心逻辑 |
| **部署环境** | Cloudflare Pages | 纯静态资源托管，安全 HTTP 响应头防护 |

### 常用开发命令

```bash
# 启动本地开发
npm run dev

# 代码格式化与质量检查
npm run audit         # 阻断 Critical / High 依赖漏洞
npm run lint          # ESLint 检查
npm run lint:fix      # ESLint 自动修复
npm run format        # Prettier 格式化
npm run format:check  # Prettier 格式校验

# 单元测试与类型检查
npm test              # 运行 Vitest 测试套件
npm run check         # 运行 astro check 类型与模板检查

# 生产打包与本地静态预览
npm run build         # 打包生成 dist/ 静态文件
npm run check:dist    # 校验公开产物、草稿隔离和 Cloudflare 标记
npm run serve         # 启动轻量静态服务器预览 dist/
npm run preview       # 使用 astro preview 预览打包产物
```

> 💡 **完整质量门禁**：与 CI 保持一致，在提交重要改动前推荐依次运行：
> `npm run audit && npm run lint && npm run format:check && npm test && npm run check && npm run build && npm run check:dist`

### 路由与端点一览

| 路径 | 说明 |
|---|---|
| `/` | 首页（英雄区 + 文章卡片瀑布流） |
| `/page/[page]` | 首页文章列表静态分页（第 2 页起） |
| `/posts/[...slug]` | 文章正文详情页 |
| `/archives` | 按年份时间线汇总归档 |
| `/topics`、`/categories`、`/tags` | 话题、分类与标签聚合浏览 |
| `/search` | 独立搜索页面（同时支持弹窗快速搜索） |
| `/rss.xml`、`/atom.xml` | RSS 与 Atom 订阅源 |
| `/search-index.json` | 客户端毫秒级搜索索引（构建时生成） |
| `/github-contributions.json` | GitHub 提交热力图静态数据快照（构建时生成） |
| `/featured-posts.json` | 精选文章静态 JSON 数据 |
| `/404` | 友好的 404 错误页面 |

### 深入文档索引

详细的底层设计文档可参阅 [`docs/`](docs/) 目录：

- 🏛️ [架构设计 (docs/architecture.md)](docs/architecture.md)：常驻 Shell、Vue 单例、客户端安全助手等底层设计。
- ⚙️ [配置链详解 (docs/configuration.md)](docs/configuration.md)：配置流向、高级定制与扩展指南。
- 📚 [内容管理规范 (docs/content.md)](docs/content.md)：文章 Schema、封面优化机制与排版建议。
- 🧭 [路由与页面生命周期 (docs/routes.md)](docs/routes.md)：详细路由职责与静态生成策略。
- 🎨 [CSS 与动效规范 (docs/css.md)](docs/css.md)：设计令牌、加载顺序与无障碍动效。
- 🧹 [仓库卫生与规范 (docs/hygiene.md)](docs/hygiene.md)：提交规范、图标内联与迁移指南。

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源，欢迎自由使用、修改与分享。
以及感谢由 LinuxDO 社区支持。
