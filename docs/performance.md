# 加载性能与低端设备 (Performance)

目标读者包括中国大陆网络、慢速移动网络和老旧手机/笔记本。本页说明站点为此做的取舍，以及改动时不能破坏的约束。

---

## 🌐 网络：不依赖境外资源

| 约束 | 做法 | 守护 |
| --- | --- | --- |
| 关键路径上没有第三方源 | 不使用 Google Fonts（大陆经常被阻断）。原来的 Inter、Noto Sans SC、Noto Serif SC 改由 `@fontsource*` 自托管，字形与切片方式和 Google 一致（每个字重约 100 个 unicode-range 切片，页面只下载实际用到的字所在的切片，`font-display: swap`），视觉效果不变 | `check:dist`：任何 HTML 出现 `fonts.googleapis.com` / `fonts.gstatic.com` 即失败 |
| 带哈希的构建产物永久缓存 | `public/_headers`：`/_astro/*` → `max-age=31536000, immutable`；`/res/*` 7 天；`search-index.json`、`github-contributions.json` 1 小时 + `stale-while-revalidate` | `check:dist` 校验 `/_astro/*` 规则 |
| 浏览器不下载 zod | 配置校验放在 `src/data/validate-site-config.ts`，只由 `BaseLayout.astro`（服务端）导入；`src/data/site.ts` 不引用 schema | `check:dist`：任何客户端 chunk 含 `ZodError` 即失败 |
| 每个岛屿共享的入口保持轻量 | `vue-virtual-scroller` 不在 `_app.ts` 全局注册；`SearchModal` 通过 `defineAsyncComponent` 在打开搜索时才加载，并自带滚动器及其 CSS | `check:dist`：`_app.*.js` 含 `DynamicScroller` 即失败 |
| 客户端 JS 总量有预算 | 当前预算见 `scripts/check-dist.mjs` 的 `JS_BUDGET_BYTES`（未压缩字节） | 超预算构建检查失败；只能有意识地上调 |
| 首图按屏幕下载 | 文章头图生成 640 / 960 / 1400 三档并输出 `srcset` + `sizes` | `check:dist` 校验头图 `srcset` |

文章正文里的图片请放进文章目录用相对路径引用，交给 astro:assets 生成 WebP 与 `srcset`；外链图片不会被优化，也可能在国内打不开。

## 🖼️ 壁纸：有约束的轮播

- 首帧永远是本地的 `wallpaper.defaultImage`（`<head>` 里低优先级预取）。
- 首屏场景被滚出视口后（`scrollProgress ≥ 1/1.2`，此时整个 hero 已淡出为 0），`WallpaperController.pause()` 停止轮播、停止下载并暂停 Ken Burns；滚回来时 `resume()`。
- 外部壁纸 API 连续 2 次用尽重试仍失败时，本次会话不再请求外部 API，保留当前画面（通常是本地默认图）。

## 🪶 轻量模式（网速差时自动降级）

默认情况下所有访客看到的都是**完整的原版效果**。只有网络差时才降级：`src/lib/performance-mode.ts` 里的 `LITE_MODE_BOOT_SCRIPT` 在首帧前内联执行，满足任一条件即给 `<html>` 打上 `data-perf="lite"`：

- `navigator.connection.saveData`（浏览器省流量模式）
- `effectiveType` 为 `slow-2g` / `2g` / `3g`（Network Information API，仅 Chromium 系浏览器提供；Safari / Firefox 不上报网速，因此始终是完整效果）
- `prefers-reduced-data: reduce`

设备性能（内存、CPU 核数）和「减少动态效果」**不会**触发轻量模式；后者由各处 `prefers-reduced-motion` 规则单独处理。

没有 UI 开关；判断只在这一处进行，岛屿通过 `isLiteMode()` 读取结果。ClientRouter 切页会重置 `<html>` 属性，脚本会在 `astro:after-swap` 时重新打上。

轻量模式关闭的内容：

| 项目 | 位置 |
| --- | --- |
| Web 字体：字体变量换成纯系统字体栈，Inter / Noto 文件一个都不下载 | `src/styles/performance.css` |
| 所有 `backdrop-filter`（磨砂玻璃），面板与顶栏改为近乎不透明的底色 | `src/styles/performance.css` |
| 全屏噪点叠加层 | `performance.css` |
| 跑马灯、状态点等无限动画；大面积多层光晕阴影；常驻 `will-change` | `performance.css`、`HeroWidgetMarquee.vue` |
| 壁纸轮播、外部壁纸 API、Ken Burns 缩放（只显示本地默认图） | `WallpaperController`（`{ lite: true }`） |
| 首屏滚动时的全屏 3D 下沉变换（只保留淡出） | `SiteShell.vue` `heroStyle` |
| JS 惯性滚轮（改用浏览器原生滚动） | `src/scripts/inertial-scroll.ts` |

新增重型视觉效果时，请同时在 `performance.css` 或对应组件里为轻量模式提供降级。

## ✅ 不论是否轻量都生效

- 移动端（≤ 900px）不挂载首屏跑马灯组件，避免隐藏状态下仍在跑的时钟与动画。
- 不需要轻量模式也不会加载壁纸的场景：移动端没有壁纸。
