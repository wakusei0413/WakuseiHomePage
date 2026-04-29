# Wakusei HomePage

![Version](https://img.shields.io/badge/version-1.5.0-9a0a0a?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-ffe600?style=for-the-badge)
![Astro](https://img.shields.io/badge/Astro-5-ff5d01?style=for-the-badge&logo=astro&logoColor=white)
![SolidJS](https://img.shields.io/badge/SolidJS-1.9-2c4f7c?style=for-the-badge&logo=solid&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-static-f38020?style=for-the-badge&logo=cloudflarepages&logoColor=white)

这是一个基于 `Astro + SolidJS + TypeScript` 的单页静态个人主页，继续以纯静态资源方式部署到 `Cloudflare Pages`。

![主页截图](docs/assets/screenshots/homepage-01.png)

## 1.5.0 大版本更新

`1.5.0` 是一次架构级更新，重点不是重做视觉，而是把旧的纯手写运行时迁移到更清晰、可维护、可测试的 Astro/Solid 结构。

主要变化：

- 从旧的 `index.html + config.js + js/app.js` 运行时迁移到 `Astro + SolidJS + TypeScript`
- 继续保持静态站点部署，`npm run build` 仍然输出到 `dist/`
- 内容配置集中到 `src/data/customize.ts`
- 配置结构使用 `Zod` 做运行时校验，并用 TypeScript 类型约束编辑体验
- 社交导航按钮改为 Solid 组件，支持即时指针交互和左上弹起效果
- 壁纸加载逻辑迁移到 `src/lib/wallpaper-scroller.ts`，保留预加载、重试、滚动和图片清理能力
- 打字机、时间面板、加载遮罩等交互迁移为独立组件
- 移除旧的 `nomodule` 和 `legacy.js` 兼容链路，目标改为现代浏览器
- 新增测试覆盖配置校验、标语选择、时间格式、壁纸加载、图标加载和社交按钮交互

部署侧没有引入服务端依赖，不需要 `Astro SSR`、`Cloudflare Functions` 或额外后端服务。

## 技术栈

- `Astro 5`
- `SolidJS`
- `TypeScript`
- `Zod`
- `ESLint`
- `Prettier`

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:4321
```

## 常用命令

```bash
npm run lint
npm run format:check
npm test
npm run check
npm run build
npm run serve
```

- `npm run dev`：启动 Astro 开发服务器
- `npm run lint`：检查 TypeScript、Solid 组件和配置文件
- `npm run format:check`：检查代码格式
- `npm test`：运行单元测试和样式回归测试
- `npm run check`：运行 Astro 类型检查
- `npm run build`：构建静态产物到 `dist/`
- `npm run serve`：预览 `dist/` 静态产物

## 部署说明

Cloudflare Pages 仍然按静态站点方式部署：

- 构建命令：`npm run build`
- 输出目录：`dist`

当前项目不依赖 `Astro SSR`、`Cloudflare Functions` 或额外后端服务。

## 配置指南

日常改内容主要编辑：

- `src/data/customize.ts`

常用配置区域：

- `profile`：头像、名字、状态文案
- `socialLinks`：社交按钮名称、链接、图标、颜色
- `slogans`：打字机文案、播放顺序、输入速度、停顿时间
- `time`：时间格式、日期和星期显示
- `loading`：加载页轮播文案
- `wallpaper`：壁纸接口、预加载数量、滚动速度、最大图片数
- `animation`：打字机光标样式
- `contentProtection`：复制、拖拽等交互限制
- `effects`：滚动揭示等页面效果

配置运行链路：

- `src/data/customize.ts`：主要人工编辑入口
- `src/data/site.ts`：应用实际读取的校验后配置
- `src/data/schema.ts`：`Zod` 配置结构校验
- `src/types/site.ts`：配置类型定义
- `src/data/README.md`：配置项速查说明

修改建议：

- 改文案、链接、颜色、壁纸接口时，优先只改 `src/data/customize.ts`
- 改字段结构时，同时更新 `src/data/schema.ts` 和 `src/types/site.ts`
- 改页面表现或交互时，优先看 `src/components/` 和 `src/lib/`
- 改社交按钮弹起手感时，看 `src/components/SocialLinks.tsx` 和 `css/components.css`

## 页面结构

主要入口和组件：

- `src/pages/index.astro`：首页入口
- `src/layouts/BaseLayout.astro`：基础 HTML、SEO、字体和全局样式入口
- `src/components/HomepageApp.tsx`：主页主交互容器
- `src/components/SocialLinks.tsx`：社交导航按钮
- `src/components/TypewriterSlogan.tsx`：打字机文案
- `src/components/ClockPanel.tsx`：右侧时间面板
- `src/components/LoadingOverlay.tsx`：加载遮罩

主要逻辑工具：

- `src/lib/wallpaper-scroller.ts`：壁纸加载、预加载、滚动和清理
- `src/lib/runtime-effects.ts`：页面运行时交互效果
- `src/lib/font-awesome.ts`：图标字体延迟加载
- `src/lib/slogan-selector.ts`：标语顺序和随机选择
- `src/lib/time.ts`：时间格式化

## 样式说明

样式集中在 `css/` 目录：

- `css/base.css`：变量、重置、全局基础样式
- `css/layout.css`：左右面板和壁纸区域布局
- `css/components.css`：头像、社交按钮、加载页、时间面板等组件样式
- `css/responsive.css`：移动端和窄屏适配

社交导航按钮的弹起手感主要由这两处控制：

- `src/components/SocialLinks.tsx`：通过指针事件切换即时悬浮状态
- `css/components.css`：控制按钮上浮方向、阴影和颜色

当前社交按钮保持“碰到后向左上弹起”的视觉方向，同时用固定按钮槽位避免鼠标位于按钮缝隙时反复闪烁。

## 静态资源

静态资源放在：

- `public/res/`

头像路径保持为：

```text
/res/img/logo.png
```

这样部署后的公开访问路径不会因为迁移到 Astro 而改变。

## 测试覆盖

当前测试位于 `tests/`：

- 配置结构校验
- 标语选择逻辑
- 时间格式化
- 壁纸滚动和图片属性
- Font Awesome 延迟加载
- 社交按钮样式和即时指针交互

完整验证建议使用：

```bash
npm run lint
npm run format:check
npm test
npm run check
npm run build
```

## 开源协议

本项目使用 `MIT License`，详见 [LICENSE](LICENSE)。
