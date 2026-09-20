# 样式体系与动效规范 (CSS Guide)

本项目采用现代原生 CSS 构建，完全脱离沉重的原子化样式框架，拥有极致的渲染性能与统一的设计语言。

---

## 🎨 样式加载顺序（严格约束）

`src/layouts/BaseLayout.astro` 里的 CSS 导入顺序决定了浏览器样式的最终层叠优先级，**请勿随意调换顺序**：

```
base.css          → 全局变量、设计令牌、字体与基础元素重置
layout.css        → 整体网格、左侧面板、常驻 Shell 容器与入场动效
transitions.css   → View Transitions 切页缓动、标题微位移过渡
components.css    → 卡片、按钮、徽章、模态弹窗与通用组件
responsive.css    → 移动端与平板自适应断点规则
dock.css          → 桌面端与移动端 Dock 胶囊条
topbar.css        → 顶栏与移动端抽屉菜单
footer.css        → 页脚布局与社交图标
article.css       → 文章排版、阅读控制、代码高亮、阅读进度条
toc.css           → 文章悬浮目录树与高亮定位
```

---

## 💎 设计令牌 (Design Tokens)

所有组件样式均优先继承 `src/styles/base.css` 中定义的设计令牌：

### 1. 面板与磨砂玻璃
- `--panel-bg`: 基础卡片背景（深浅色自适应半透明色）。
- `--panel-border`: 细腻的 1px 半透明边框。
- `--glass-blur`: 磨砂玻璃模糊滤镜。
- `--glass-tint`: 依据壁纸色调自动微调的背景衬色。

### 2. 动效曲线
- `--curve-delicate`: `cubic-bezier(0.16, 1, 0.3, 1)`（细腻舒缓，用于面板展开、标题浮现）。
- `--curve-snap`: `cubic-bezier(0.4, 0, 0.2, 1)`（敏捷利落，用于按钮悬停、普通图标交互）。

### 3. 字体体系
- `--font-serif`: 文艺阅读衬线字体。
- `--font-ui`: 系统级无衬线 UI 字体。
- `--font-mono`: 代码等宽字体。

---

## 🚀 2.0.0 视觉交互细节规范

### 1. 3D 微浮动悬停系统 (3D Lift) 与防模糊处理
- 博客卡片悬停时拥有轻微的向上浮动与阴影扩散质感。
- **防字体发虚**：列表卡片的位移严格采用清晰的二维 `translateY` 配合硬件加速，避免因复杂 3D perspective 导致 Chromium 渲染内核的字体亚像素抗锯齿发虚。

### 2. 悬浮面板纯色不透明策略 (Solid Opaque Panels)
- 文章**目录树（TOC）**与**阅读控制弹窗**采用实心不透明背景（Solid Opaque），避免半透明磨砂在滚动时被背后文章文字与复杂壁纸干扰，保证长文阅读的绝对清晰与高对比度。

### 3. 无障碍动效减弱模式 (prefers-reduced-motion)
- 针对开启了系统“减少动态效果”的用户，全站切页动效自动退化为瞬间切换，壁纸缩放微动效自动暂停，保障光敏与易眩晕人群的舒适体验。
