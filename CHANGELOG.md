# 更新日志 (Changelog)

本文件记录了 Wakusei HomePage 的重要版本演进。

---

## [2.0.0] - 2026-09-20

Wakusei HomePage 2.0.0 是一个**里程碑式的全新重构版本**。从底层框架到交互体验，我们彻底推翻了旧版的局限性，全面拥抱 **Astro 7 + Vue 3 + Pinia + TypeScript** 现代纯静态架构，实现了“原生 App 般的流畅交互”与“纯静态网站极速稳定”的完美结合。

### 🌟 新特性与用户体验提升

- **📖 全新长文阅读器体验**：
  - **阅读控制面板**：文章页新增悬浮控制按钮，支持自定义字号缩放（基准 110%）、文章排版宽度自由调节、快速明暗主题切换与一键全屏沉浸阅读。
  - **高对比度纯色目录（TOC）**：目录背景升级为高对比度纯色遮罩，彻底杜绝文字与背景壁纸重叠发虚问题，滚动时精准高亮当前阅读章节。
  - **交互增强**：代码块一键复制（配备剪贴板智能兼容回退）、文章插图点击画廊灯箱放大、顶部细致阅读进度条。
- **🚀 极速首屏与丝滑过渡**：
  - **去除阻塞式加载**：移除旧版本中遮挡全屏的 Loading 菊花图与蒙层，首屏内容在首帧立即渲染呈现。
  - **Astro 原生 View Transitions**：采用 Astro 7 的 `ClientRouter`，深度调优切页贝塞尔缓动曲线，跨页面跳转丝滑不白屏。
  - **首页跑马灯标语**：标语展示升级为现代流式轮播跑马灯，支持按顺序或随机切换，动画更加细腻平稳。
- **🖼️ 电影级会呼吸的动态壁纸**：
  - 支持本地 WebP 壁纸与多外部接口智能竞态拉取。
  - 搭载基于 Web Animations API 的 Ken Burns 呼吸微动效，切页时平滑接管缩放相位，无视觉跳跃或重置感。
- **🔍 全键盘即时搜索**：
  - 毫秒级客户端搜索，支持全局快捷键快速呼出。
  - 完整支持键盘 `↑` / `↓` 导航选文、`Enter` 跳转、`Esc` 退出，具备焦点锁定（Focus Trap）能力。
- **📊 GitHub 动态贡献热力图**：
  - 构建期抓取 GitHub 53 周提交记录并生成站内静态快照，无需个人私密 Token 即可在首页展示绿格子，接口异常时优雅降级。
- **📱 无障碍与移动端触控优化**：
  - 全站按钮与交互元素遵循 WCAG 规范，触控热区均达到 44px+，防止手机误触。
  - 全站深度支持系统级 `prefers-reduced-motion`（减弱动态效果），为敏感用户提供静止平稳的浏览体验。

### ⚡ 底层技术与性能优化

- **Astro 7 + Vue 3 深度整合**：
  - 核心组件全面重写为 Vue 3 `<script setup>` 组合式 API，配合 Pinia 进行统一的状态管理。
  - **Vue 运行时单例去重**：通过定制的 `@astrojs/vue/client.js` 别名入口（`astro-vue-client.ts`），解决了多 island 水合时 Vue 实例与 Pinia 上下文脱钩的底层问题。
- **Cloudflare 生产环境兼容防护**：
  - 自动为构建产物注入 `data-cfasync="false"` 属性，有效阻止 Cloudflare Rocket Loader 篡改脚本执行顺序导致 View Transitions 失效。
- **构建期封面图片优化**：
  - 基于 Sharp 引擎在构建时自动将文章相对路径封面图片转码为高压缩比 WebP，并生成响应式尺寸。
- **代码规范与测试安全**：
  - 全面配置 ESLint、Prettier、TypeScript（`astro check`）与 Vitest 单元测试，确保类型安全与工程严谨性。
  - CI 新增依赖安全审计与静态发布产物检查，验证草稿隔离、Feed、Sitemap、搜索索引和 Cloudflare Rocket Loader 标记。

### 📝 内容调整

- 撤下 `app-filing-and-internet-control` 与 `huaxue` 两篇文章；它们不再生成公开路由，也不会进入搜索、归档、Feed 或 Sitemap。

### 🔄 1.x → 2.0 迁移与配置变更 (Breaking Changes)

如果您是从 1.x 版本升级，请留意以下配置调整（均位于 `src/data/customize.ts`）：

1. **标语配置简化**：
   - 移除了旧版的 `slogans.typeSpeed` 与 `animation.cursorStyle`。
   - 新增 `slogans.mode`（`'sequence' | 'random'`）以及 `slogans.pauseDuration`。
2. **顶栏导航调整**：
   - 2.0.0 默认配置不再包含无实际功能的“设置”占位链接，顶栏更清爽。
   - 顶栏项继续支持 `link` / `action` / `panel` / `divider`。
3. **调试日志**：
   - 生产环境默认将 `debug.consoleLog` 设为 `false`，保持控制台整洁。
4. **外部依赖精简**：
   - 移除了 `@swup/astro` 与 `@fortawesome/*` 运行时依赖，导航由 Astro 原生负责，图标由 `Icon.vue` 内联 SVG 渲染。

---

## 历史版本记录

- **2.0.0-alpha.4**：优化搜索键盘导航、触控热区与文字对比度；修复卡片悬停字体发虚问题。
- **2.0.0-alpha.3**：集成首屏跑马灯标语；优化磨砂玻璃与壁纸采样色算法；增强 CSP 与安全响应头。
- **2.0.0-alpha.2**：完成博客内容管道升级、静态分页、时间线归档与壁纸呼吸动效。
- **2.0.0-alpha.1**：完成从 Svelte / Swup 到 Astro 7 + Vue 3 + Pinia 的核心架构迁移。
