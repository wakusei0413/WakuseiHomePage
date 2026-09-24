# 更新日志

这里记录 Wakusei HomePage 每个版本真正影响使用体验的变化。

按「新增 / 变更 / 修复 / 移除」归类，版本倒序排列。早期条目为依据当时的发布说明与提交历史整理的回溯记录。

---

## 2.0.3

2026-09-24

### 新增

- 引入 `vue-virtual-scroller` 虚拟滚动：
  - 全局集成 `vue-virtual-scroller`（v3.0.5）及其官方样式与 TypeScript 全局组件类型定义，全站 Vue 组件均可直接使用虚拟滚动能力。
  - 顶栏搜索弹窗（`SearchModal`）结果列表重构为动态虚拟滚动（`DynamicScroller`）：根据卡片标题、描述与高亮片段自适应高度，按需挂载视口内卡片，大幅减少大量搜索结果下的 DOM 节点数量与内存占用。
  - 键盘导航平滑联动：使用键盘上下键（<kbd>↑</kbd> / <kbd>↓</kbd>）在搜索结果间移动时，通过 `scrollToItem` 平滑滚动至目标项，保证视口外选中项即时可见。
- 旧浏览器兼容提示页：IE，以及无法正常显示本站的老旧浏览器，会离开正常页面，进入单独的提示页。
  - 提示页说明当前浏览器无法正常显示网站，样式与站点卡片一致（细边框、圆角、浅阴影），并提供中文、英文、日文说明。
  - 提供 Chrome、Edge、Firefox 的下载按钮，分别前往对应的中文下载页。
  - 提供「订阅 RSS」按钮，直接打开 `/rss.xml`。旧浏览器打不开网页时仍可订阅，不依赖剪贴板。
  - 若之后改用可以正常显示的浏览器打开这个提示页（例如关闭 IE 模式并重新加载），会自动回到首页，不会停在提示页上。仍无法显示的浏览器会留在提示页，不会来回跳转。

### 变更

- 文章正文的本地配图启用响应式加载：在原有 WebP 转码基础上生成多种宽度的图片，通过 `srcset` / `sizes` 让浏览器按屏幕宽度和像素密度选择，手机阅读时不再总是下载原尺寸图片。封面仍保持原有单尺寸处理，正文图片灯箱正常使用。
- 文章页底部导航按钮样式与交互对齐：文章底部的「文章列表」与「首页」按钮与主页「上一页 / 下一页」分页控件规范统一，移除常驻淡蓝背景，改为统一的细腻磨砂玻璃底色；悬停时边框、背景与文字图标一同平滑过渡为品牌蓝，移除多余的 3D 上浮与投影扩散，点击时加深蓝色底色反馈，并对齐暗色模式主题。

### 修复

- 桌面壁纸在页面转入后台，或壁纸控制器被销毁后，不再继续请求外部图片；回到前台或重新创建后再继续加载。
- 搜索页不再把完整正文索引嵌进页面。未输入关键词时直接显示文章卡片，开始搜索后读取站内索引，并复用已处理的文本。
- 静态构建复用同一批文章、封面和统计数据，避免每个页面重复读取和处理内容。
- 修复开发环境下页面水合失败：Vue 热更新运行时缺失时，不再因为 `__VUE_HMR_RUNTIME__` 未定义而中断 `SiteShell` 初始化。
- RSS 与 Atom 可以在阅读器里直接读完全文。此前每篇只有摘要，订阅源虽然列出了全部已发布文章，阅读器里往往只看到最新几篇的开头。现在每篇文章都带上完整正文、封面和文内图片，图片与链接使用站点绝对地址。已经订阅过的阅读器会沿用旧缓存，需要删掉订阅后重新添加，才能看到全文和更早的文章。

---

## 2.0.2

2026-09-23

### 新增

- 开放 RSS / Atom 订阅入口：左侧边栏社交区新增第 6 张 RSS 卡片，填补 2×3 宫格右下角空位，尺寸分毫不变（零布局位移）。
- 社交卡片支持 `copy: true` 复制语义：
  - 点击 RSS 卡片不再发生页面跳转，而是直接将完整的订阅地址（如 `https://www.wakusei.top/rss.xml`）复制到剪贴板，并在卡片正上方滑入弹出精致的浮动 Toast 气泡（「已复制订阅地址 / 粘贴到阅读器即可订阅」），带指示箭头并在 2.4 秒后平滑淡出。
  - 卡片点击后立即解除聚焦并退回静止态，不残留高亮与浮起，与其他按钮交互体验完全一致。
  - 保留逃生口：按住 <kbd>Ctrl</kbd> / <kbd>⌘</kbd> 点击或鼠标中键点击仍会直接在新标签页打开原始 XML。
  - 补齐 Font Awesome 6 `rss` 图标，并在 `zh-CN`、`en`、`ja` 三语种中同步国际化文本与无障碍屏幕阅读器播报（`role="status" aria-live="polite"`）。
- 新增 `tests/social-link-copy.test.ts` 与 `tests/image-loading-reveal.test.ts` 契约与功能测试。

### 修复

- 文章卡片封面（`PostCard`）「啪」地突然闪现与滚动掉帧：
  - 根因排查：原本封面的 `src` 被 IntersectionObserver 扣留未在 SSR 中输出，导致原生 `loading="lazy"` 与 `fetchpriority="low"` 完全失效，必须等客户端水合及卡片滚到眼前才开始请求，且缺失透明度过渡。
  - 修复：封面 `src` 在 SSR 阶段常驻，交由浏览器原生懒加载提前预取；绑定 `HTMLImageElement.decode()` 在位图解码就绪后触发 `opacity 0.45s` 平滑淡入，淡入路径不再占用主线程解码；补全客户端水合前的缓存命中与 `@error` 兜底，并增加 `@media (scripting: enabled)` 无 JS 保护。
  - 顺带修复 CSS 简写特异性冲突：`article.css` 的 `.post-card` 覆盖了 `components.css` 的 `.scroll-reveal` 过渡简写导致卡片显现变成硬切，已补回 `opacity 0.6s` 过渡。
- 文章图片灯箱（`image-lightbox`）换图硬切与掉帧：
  - 引入邻居图片预热与解码机制（`warmNeighbours`），左右翻页无需等待网络往返。
  - 换图流程改为 120ms 淡出 → 0 透明度提交位图并借由一帧渲染掩盖图片宽高比跳变 → 平滑淡入；引入 `swapToken` 丢弃过期切换请求。
  - 移除 `.article-lightbox` 全屏 `backdrop-filter: blur(4px)` 高开销逐帧合成滤镜。

---

## 2.0.1

2026-09-22

### 新增

- 搜索页支持 `?q=` 直达：`/search?q=关键词` 可直接带出结果，输入时地址栏实时同步（用 `replaceState`，不新增历史记录）。顶栏搜索弹窗的「查看全部结果」由此才真正可用。
- 构建期由 `customize.ts` 的默认壁纸裁切生成 1200×630 社交分享卡 `/og-default.jpg`。首页、归档、分类、标签、专题、搜索页与无封面文章改用它作为 `og:image`。
- `og:image:width` / `height` / `type`，取值来自 `getImage()` 输出的真实尺寸。
- 文章页 `BreadcrumbList` 结构化数据（首页 › 分类 › 标题）；首页 `WebSite`（含 `SearchAction`）。
- 页脚显示版本号。`customize.ts` 的 `version` 字段此前未被任何代码使用。

### 变更

- 新增 `src/lib/i18n.ts` 的 `translate(locale, key, params)` 纯函数与 `{name}` 占位符插值，构建期页面与客户端组件共用同一份文案，不再两处各写一遍中文。
- 新增 `usePageMeta` composable，统一归档页与搜索页原先各自实现的标题同步逻辑，并补上 `<title>` / `description` / `og:*` / `twitter:*` 的更新。
- `twitter:card` 由写死的 `summary` 改为按实际图片比例派生（横幅用 `summary_large_image`，方形仍用 `summary`）。
- 404 页去掉冗余的中英双行，改为单行本地化文案，间距同步调整。

### 修复

- 国际化未覆盖页面级内容：切换语言后浏览器标签页标题、顶栏标题，以及分类、标签、专题、归档、搜索、分页首页的页面文案与 `aria-label` 仍为中文。
- `TaxonomyPage.vue`、`TopicsPage.vue` 整体未接入 i18n，正文与计数文案全部硬编码。
- 文章页硬编码：「约 X 分钟阅读」「更新于 …」「文章列表」「首页」「← 上一篇」「下一篇 →」及 `aria-label`。
- 404 页为硬编码中英混排，不随语言切换。
- 搜索结果中的「查看全部结果」按钮渲染出原始翻译键 `search.page.title →`——该键在三种语言里都不存在。
- 无封面页面与无封面文章的 `og:image` 是 288×288 的方形头像。

### 移除

- 死翻译键 `dock.settings`、`dock.settings.coming-soon`（移除 Dock 设置入口后的遗留）。

### 已知限制

站点没有按语言分路由（无 `/en/`、`/ja/` 这类地址），构建产物的 `<title>` / `description` / `og:*` 只能是默认语言。浏览器内的元数据同步发生在 hydration 之后，因此不执行 JavaScript 的爬虫与社交平台抓取器读到的仍是中文。彻底解决需要引入 i18n 路由，不在本版本范围内。

---

## 2.0.0

2026-09-20

从纯展示型单页升级为完整的静态博客系统，框架由 Astro 5 + SolidJS 迁移到 Astro 7 + Vue 3 + Pinia。

标为「未单独发版」的条目，是 2026-05-07 ~ 2026-06-22 期间的改动，随本版一起发布。

### 新增

**博客系统**

- 首页文章瀑布流与静态分页（`/page/2` 起）。
- 时间线归档 `/archives`；分类 `/categories`、标签 `/tags`、专题 `/topics`。
- RSS 2.0（`/rss.xml`）与 Atom（`/atom.xml`）订阅源。
- 构建期用 Sharp 将封面与正文配图转码为 WebP。

**阅读器**

- 悬浮阅读控制面板：字号多档缩放（基准提升至 110%）、版面宽度窄 / 标准 / 宽三档。
- 侧边悬浮目录（TOC）：纯色高对比背景，滚动自动高亮当前章节，点击平滑滚动。
- 沉浸阅读模式，配合即时明暗主题切换。
- 代码块复制按钮（含剪贴板兼容回退）；标题悬停复制锚点。
- 正文插图灯箱。
- 顶部阅读进度条。
- 文章底部上一篇 / 下一篇导航。

**搜索**

- 全局快捷键唤出搜索弹窗，检索标题、摘要与正文，支持中英文混搜与多关键词。
- 全键盘操作：`↑` `↓` 切换结果、`Enter` 跳转、`Esc` 退出，焦点锁定在搜索框内。
- 独立搜索页 `/search`。

**壁纸与主题**

- Ken Burns 呼吸缩放微动效（Web Animations API），切页时平滑接管缩放相位。
- 采样壁纸主色与对比度，自动调整毛玻璃面板与文字反色。
- 本地 WebP 壁纸与外部 API 竞速加载，失败时降级。
- 遵循 `prefers-reduced-motion`。

**首页**

- GitHub 贡献热力图：构建期抓取过去 53 周提交，无需配置 Token，接口异常时降级。
- 跑马灯标语，支持顺序轮播与随机切换。
- 三语国际化：`zh-CN` / `en` / `ja`，无刷新切换。

**移动端**

- 抽屉式导航栏。
- 交互元素的触控热区不小于 44px。

### 变更

- 交互组件重写为 Vue 3 `<script setup>` 组合式 API，引入 Pinia 做全局跨页状态管理。
- 自研 `@astrojs/vue/client.js` 入口别名（`astro-vue-client.ts`），解决多 island 水合时 Vue 实例与 Pinia 状态解绑的问题。
- 全站图标改为按需内联 SVG。
- 全站跳转改用 Astro 7 `ClientRouter`，顶栏与背景壁纸跨页常驻。
- 构建产物自动注入 `data-cfasync="false"`，避免 Cloudflare Rocket Loader 打乱脚本执行顺序导致 View Transitions 失效。
- 测试框架升级为 Vitest；CI 增加 `npm audit` 依赖审计与 `check:dist` 产物校验。
- 移除运行时加载的完整 Font Awesome CSS / Webfont，改为内联 SVG 图标组件。（未单独发版）
- 减少 Google Fonts 请求的字重数量；为头像图片添加 preload。（未单独发版）
- 为壁纸 API 域名添加 `dns-prefetch`，桌面端添加 `preconnect`。（未单独发版）
- 桌面 Dock 悬停放大与打字机文案动画改用 `requestAnimationFrame` 调度。（未单独发版）
- 手机侧边栏改为直接读取 `dock.items` 渲染，新增 Dock 项、`iconActive`、链接项与分隔线会自动同步。（未单独发版）
- 新增主题变化事件订阅，桌面 Dock 与手机侧边栏主题状态保持同步。（未单独发版）

### 修复

- 移除遮挡首屏的全屏 Loading 遮罩，首帧直接呈现内容。
- 移动端深色模式下透明头像渲染为白方块。
- 移动端分隔线粗细不一致。
- 切换主题后图标不更新。
- 899px ~ 901px 临界断点下的横向溢出。
- 标语打字机动效的抖动与卡顿。
- 加载遮罩提前隐藏导致首屏壁纸闪烁；改为等待初始壁纸批次加载完成或失败，并在显示前执行图片 decode 与短暂显影缓冲。（未单独发版）
- 手机侧边栏切换主题后图标不跟随变化。（未单独发版）
- 统一 Dock 与手机侧边栏的分隔线粗细，并在侧边栏最后一项后自动补充分隔线。（未单独发版）
- 黑夜模式下主页头像框被全局暗色主题的细边框影响，改为独立变量控制。（未单独发版）
- 手机左侧边栏透明头像渲染为白色方块，改用独立容器承载边框与投影。（未单独发版）
- 为主页头像与移动侧边栏头像补充宽高与加载策略，减少布局抖动。（未单独发版）

### 移除

- 全屏 Loading 遮罩。
- Font Awesome Webfont 字体包与配套 CSS。
- `slogans.typeSpeed`、`animation.cursorStyle` 配置项。
- 顶栏无实际功能的「设置」占位链接。

### 从旧版本升级

仅维护自己的 `src/data/customize.ts` 时需要留意：

- 标语改用 `slogans.mode`（`'sequence' | 'random'`）与 `slogans.pauseDuration` 控制。
- 生产环境 `debug.consoleLog` 默认为 `false`。
- 图标系统内置常用 SVG，不再需要外部字体文件。
- 两篇历史文章已设为草稿：`app-filing-and-internet-control`、`huaxue`。不生成公开页面，也不进入归档、分类、标签、搜索索引、RSS、Atom 与 Sitemap。

---

## 2.0.0-alpha.4

2026-08-13

### 变更

- 优化搜索键盘操作、触控热区与文字对比度。

### 修复

- 卡片悬停时文字发虚。

---

## 2.0.0-alpha.3

2026-07-24

### 新增

- 首页跑马灯标语。

### 变更

- 优化壁纸与磨砂玻璃效果。
- 增强安全响应头。

---

## 2.0.0-alpha.2

2026-07-22

### 新增

- 博客内容管道、静态分页与文章归档。
- 壁纸呼吸动效。

---

## 2.0.0-alpha.1

2026-06-22

### 变更

- 核心架构从 SolidJS 迁移到 Astro 7 + Vue 3 + Pinia。

---

## 1.9.0

2026-05-07

### 变更

- 移动端布局首次进入时跳过 wallpaper 组件直接进入主页，减少等待时间。
- 桌面端仍加载壁纸，并由加载页实时显示图片预加载进度。
- 手机 / 电脑布局切换时重新进入加载界面，按当前布局重建壁纸加载流程。

---

## 1.8.5

2026-05-03

### 新增

- `dock` 配置区域：导航栏图标、顺序与行为全部从 `src/data/customize.ts` 读取，不再硬编码。支持 `action`（主题切换）、`panel`（语言选择）、`link`（任意链接）、`divider`（分隔线）四种元素，可自定义 `icon` / `iconActive` / `text` / `i18nKey` / `href`。
- 日语（`ja`）语言选项，日期采用汉字大写数字格式（如「五月二日」「土曜日」）。

### 变更

- `toggleTheme`、`language` 作为内置保留功能；未知 `action` / `panel` 输出 `console.warn`，作为扩展接口预留。
- 根目录 `README.md` 成为唯一说明文档，`src/data/README.md` 合并删除。

### 移除

- `/settings` 页面，替换为 404 页面；所有不存在的路由自动 fallback 到 404。

---

## 1.8.0

2026-05-02

### 新增

- `ControlDock` 组件：主题切换（浅色/深色）、语言切换（中文/英文）、设置入口。
- `src/data/i18n.ts` 翻译数据（dock 标签、星期、月份）与 `src/lib/i18n.ts` i18n 运行时（基于 SolidJS signals）。
- `src/styles/dock.css` 控制面板样式。
- `/settings` 施工中页面。
- 测试覆盖 i18n 配置校验、翻译数据完整性与运行时切换。

### 变更

- 主题状态持久化到 `localStorage`，页面加载时自动恢复，无闪烁。
- `ClockPanel` 按语言环境显示本地化的星期与月份；`SocialLinks` 链接名称与 `TypewriterSlogan` 标语支持多语言。
- 控制面板在 PC 端为液态玻璃弹出面板，移动端为底部抽屉。
- PC 端 Dock 图标支持软放大悬停效果。

---

## 1.5.0

2026-04-29

架构级更新，重点是把纯手写的运行时迁移到 Astro + SolidJS + TypeScript。部署侧未引入服务端依赖，不需要 Astro SSR、Cloudflare Functions 或额外后端。

标为「未单独发版」的条目，是 2026-04-22 ~ 2026-04-23 期间的改动，随本版一起发布。

### 新增

- 测试覆盖配置校验、标语选择、时间格式、壁纸加载、图标加载与社交按钮交互。
- `contentProtection` 配置：禁止文本选择与图片拖拽。（未单独发版）
- 点击解锁遮罩（consent manager）：统一 `tryPlay` 的恢复流程，替代原先分散的处理；该遮罩在本版随旧浏览器兼容链路一并移除。（未单独发版）
- consent manager 单元测试。（未单独发版）

### 变更

- 从旧的 `index.html + config.js + js/app.js` 运行时迁移到 Astro + SolidJS + TypeScript，`npm run build` 仍输出到 `dist/`。
- 内容配置集中到 `src/data/customize.ts`，用 Zod 做运行时校验，并以 TypeScript 类型约束编辑体验。
- 社交导航按钮改为 Solid 组件，支持即时指针交互与左上弹起效果。
- 壁纸加载逻辑迁移到 `src/lib/wallpaper-scroller.ts`，保留预加载、重试、滚动与图片清理能力。
- 打字机、时间面板、加载遮罩等交互迁移为独立组件。
- Font Awesome 改为本地打包，消除 tracking prevention 警告；移除未使用的 logo preload。
- 新增 `.nojekyll`，阻止 GitHub Pages 的 Jekyll 处理 Astro 文件。
- 项目目录重组。（未单独发版）
- 标语改为顺序播放模式；更新 profile 状态、标语与页脚文案，提高滚动速度。（未单独发版）
- 生产环境关闭 `debug.consoleLog`。（未单独发版）

### 修复

- 确保所有配置开关正确生效，并补充配置校验。（未单独发版）

### 移除

- 旧的 `nomodule` 与 `legacy.js` 兼容链路（含旧浏览器点击解锁遮罩），目标改为现代浏览器。

---

## 1.0.0

2026-04-22

首个正式版本。

### 变更

- 版本号统一升级。

### 修复

- README 中过时的项目结构说明（`main.js` → `app.js`）。
- README 中颜色示例的语法错误（分号改为逗号）。
- `index.html` 中残留的 `main.js` 注释。
- 补充 README 项目结构中缺失的模块文件说明。

---

## 0.6.2

2026-04-21

### 新增

- `<noscript>` 兜底样式：禁用 JS 时自动移除 loading 遮罩，恢复页面可见与可交互。

### 变更

- 各处版本号统一。
- `build.js` 构建时通过动态 `import()` 读取 `config.js`，自动提取并注入 `dist/js/legacy.js`，消除人工同步的配置漂移。

### 修复

- `typewriter.js` 内存泄漏：废除只增不减的 `pendingTimers[]`，改为单 `activeTimer`，每次 `setTimer` 自动清理旧 timer。
- `wallpaper.js` 竞速空数组挂起：`_raceLoadImage` 增加前置断言，`apis` 为空数组时立即 `Promise.reject`，不再白等 10s 超时。

---

## 0.6.0

2026-04-21

### 新增

- `js/validate-config.js`：启动时校验 CONFIG 字段，缺失或类型错误时在控制台输出警告并阻止初始化。
- GitHub Actions 工作流（`.github/workflows/ci.yml`）：推送 / PR 到 main 时运行 lint、format:check、build。
- `validate-config.test.mjs`。

### 变更

- 9 个独立 `<script>` 标签迁移为单入口 ES Module（`js/app.js`），模块间改为 `import` / `export` 显式依赖，移除 `window.App` 全局命名空间。
- 保留 `<script nomodule>` 旧浏览器回退（`js/legacy.js`）。
- 旧 `.js` 测试替换为 `.mjs` ESM 导入。

---

## 0.5.5

2026-04-19

### 变更

- 移动端（≤900px）隐藏右侧壁纸面板，左侧信息面板全幅显示；桌面端布局不受影响。

### 移除

- 移动端壁纸切换按钮（`wallpaper-toggle`）与关闭按钮（`close-panel`）。
- 移动端面板滑入切换逻辑及相关事件监听。

---

## 0.5.0

2026-04-12

### 新增

- 旧浏览器自动兼容模式：自动检测 IE、旧版 Edge/Firefox/Chrome，以及不支持 `classList` / `IntersectionObserver` / CSS 自定义属性的浏览器。兼容模式下仅保留头像、姓名、状态、社交链接与页脚，隐藏右侧面板、Slogan 打字机、壁纸滚动、噪点特效与加载动画，并禁用动画和悬停位移。检测失败时默认进入兼容模式（fail-safe）。
- `AGENTS.md` 与设计规格 / 实现计划文档目录 `docs/superpowers/`。

### 修复

- `classList` 不可用时回退到 `className` 字符串操作。
- CSS 变量不支持时提供硬编码回退值。
- 社交链接自定义颜色在兼容模式下改用内联样式回退。
- 禁用社交链接 `::before` / `::after` 伪元素点击热区，避免垂直排列时重叠。
- 解除兼容模式下根元素 `overflow: hidden` 的滚动锁定。

---

## 0.2.3

2026-04-08

### 变更

- 版本号同步。无功能改动。

---

## 0.2.2

2026-04-08

### 变更

- README 同步上一版的改动（hover 修复、壁纸、深色模式移除）。无功能改动。

---

## 0.2.1

2026-04-08

### 新增

- `package.json`、`.eslintrc.json`、`.prettierrc`、`build.js`（terser 压缩 JS、cssnano 压缩 CSS）、`.gitignore`。
- `<link rel="preconnect">` 预连接到 jsdelivr；OG meta 标签（`og:title`、`og:description`、`og:type`）；favicon 声明。
- 关键容器添加 CSS Containment（`contain: layout style paint`）。

### 变更

- `main.js` 拆分为 `typewriter.js`、`time.js`、`social.js` 三个独立模块。
- 新增 `logger.js` 统一日志工具，消除 9 处重复的 debug 判断。
- 新增 `utils.js` 的 `debounce` 防抖函数，应用于 3 处 resize 监听。
- CSS `will-change` 永久启用，避免首次 hover 创建合成层的延迟。
- Hover transition 由 `0.15s` 缩短为 `0.08s`。
- 统一所有硬编码 z-index 为 CSS 变量（新增 `--z-loading`）。
- 壁纸保持原始比例显示，添加 `min-height: 180px` 防止塌陷。
- `theme-color` meta 改为固定 `#fffef7`。

### 修复

- Hover 边缘闪烁：为左侧栏所有 hover 位移元素添加 `::before` 静态悬停热区，解决元素 translate 移走后鼠标脱离导致 `:hover` 反复切换的问题。
- 壁纸竞速失败时彻底取消请求（`removeAttribute('src')`）。
- 壁纸模块 `destroy()` 清理 `cancelAnimationFrame`，防止泄漏；`_cleanup()` 清理 dataset 属性，协助 GC。

### 移除

- 深色模式：CSS 中全部 31 条 `[data-theme='dark']` 规则、主题切换按钮、FOUC 防闪烁脚本、`js/theme.js`。
- `.info-panel` 的重复 CSS 定义（约 40 行）；合并 `html` 选择器与 3 处 scrollbar 隐藏规则。

---

## 0.2.0

2026-04-07

### 新增

- `.right-panel-shadow` 独立阴影层，营造「透过玻璃 / 画框观看」的效果，与壁纸模块完全解耦。
- MIT License。

### 变更

- 壁纸滚动功能拆分为独立模块 `js/wallpaper.js`（`WallpaperScroller` 类），`main.js` 精简为调用代码，支持模块销毁与清理。
- 左侧面板宽度由百分比改为固定 500px；右侧面板使用 `flex: 1` 自适应延申至屏幕边缘，避免宽屏留白。
- 更新项目结构说明（删除不存在的 `loading.js`，新增 `wallpaper.js`）。

### 移除

- 未使用的 `wallpaper.infiniteScroll.initialLoad`、`effects.pixelPet.type` 配置项。
- 过时的「天气功能」相关注释与无用的壁纸滚动条 CSS。

---

## 0.1.1

2026-04-06

### 修复

- 生产环境（Vercel）壁纸无限滚动失效：`loadImageLazy` 与 `retryLazy` 引用了未定义的 `API1` / `API2`，改为使用配置化的 `APIS` 数组。

---

## 0.1.0

2026-04-06

### 新增

- `wallpaper.apis` 支持任意数量的壁纸源配置化（不再限制 2 个）。
- `wallpaper.preloadCount`、`wallpaper.raceTimeout`、`wallpaper.maxRetries` 竞速参数。
- `loading.texts` 加载文字与 `loading.textSwitchInterval` 切换间隔。

### 变更

- 壁纸 API 地址与加载提示文字由硬编码改为配置化。

### 移除

- 未使用的 `weather` 配置节，以及 `wallpaper.source`、`wallpaper.tags`、`wallpaper.r18`、`wallpaper.count` 配置项。

---

## 0.0.9

2026-04-05

### 新增

- 瀑布流无限加载壁纸：预加载前 5 张后显示主页面，滚动到底部自动追加新图片（非循环播放）。
- 内存管理：超过 50 张时自动清理最旧的 10 张。
- 支持鼠标滚轮与触摸滑动自由浏览。

---

## 0.0.8

2026-04-05

### 新增

- 滚动触发动画：元素进入视口时淡入。
- 所有特效可通过 `config.js` 独立开关与配置。

---

## 0.0.7

2026-04-05

### 变更

- 新增详细 README，包含配置指南与常见问题。

### 修复

- Font Awesome CDN 不可用，改用 jsdelivr。
- 修正 `config.js`。

---

## 0.0.6

2026-04-05

### 新增

- 社交链接支持自定义 HEX 颜色（如 `#FF6B6B`）。
- 手机端右侧面板滑入动画。

---

## 0.0.5

2026-04-05

### 新增

- 社交链接配置化，支持 Font Awesome 图标；手机端社交链接双列布局。
- 滚动壁纸上的磨砂玻璃遮罩与移动端面板切换。

### 变更

- 头像与名称改为左对齐。

---

## 0.0.4

2026-04-05

### 新增

- 带景深的玻璃拟态效果与纵向滚动壁纸。
- 手机端首页支持滚动，并添加移动端壁纸切换面板。

---

## 0.0.3

2026-04-05

### 新增

- 页脚文案配置化；加载页名称与 profile 同步。

---

## 0.0.2

2026-04-05

### 变更

- 布局调整与字体回退。

---

## 0.0.1

2026-04-05

### 新增

- 首个版本：头像、姓名、状态、社交链接、时钟与底栏 Dock 的单页个人主页。
