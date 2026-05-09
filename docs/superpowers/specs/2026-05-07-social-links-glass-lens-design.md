# 社交媒体按钮玻璃透镜效果优化

## 目标
 提升 `.social-link` 卡片边框的视觉存在感，并把 hover 时的「塑料渐变」升级为具有光学厚度感的玻璃/透镜折射效果。

## 现状问题

1. **边框过细**：`border: 1px` 在网格布局中存在感极低，显得轻飘。
2. **hover 缺乏厚度折射**：当前 hover 用 `::before`（渐变底色） + `::after`（单条高光）模拟，只是「有颜色的平面卡片」，没有边缘厚度造成的焦散（caustic）和内部反射。

## 改动范围

仅修改 `src/styles/components.css` 内以下选择器（约第 391–593 行），**不涉及任何 TS/JS 文件、类型定义或配置**。

## 具体设计

### 1. 默认状态（未悬停）

| 属性 | 当前值 | 新值 | 理由 |
|------|-------|------|------|
| `border` | `1px solid color-mix(...34%)` | `3px solid color-mix(...40%)` | 加粗边框让卡片有「镶嵌物」的实体感；不透明度从 34% 微提至 40%，避免太淡 |
| `box-shadow` | 单层外阴影 + 1px 轮廓 + 光晕 | **增加一层 `inset` 模拟边缘厚度** | 默认状态下给卡片边缘 1px 内嵌高亮，形成「厚玻璃边缘」的暗示 |

新增 inset shadow（默认态）：
```css
box-shadow:
    0 6px 18px rgba(0,0,0,0.08),
    0 0 0 3px color-mix(in srgb, var(--custom-color) 12%, transparent),  /* 轮廓稍粗 */
    0 5px 16px color-mix(in srgb, var(--custom-color) 22%, transparent),
    inset 0 0 0 1px rgba(255,255,255,0.12);  /* 内边缘微反射 */
```

### 2. Hover 状态（核心——玻璃透镜折射）

#### A. 边框提升
- `border-color` 不透明度从 `58%` 提升至 `72%`，保持 3px 粗细。
- 追加一层 `box-shadow: 0 0 0 3px color-mix(...22%)` 让外轮廓也带轻微光晕。

#### B. `::before`（底色透镜层）重构
保留原有的三层渐变结构，但在最上层叠加一层**径向焦散**：
```css
background:
    /* Layer 1: 保留原主反射高光 */
    linear-gradient(118deg, transparent 0%, transparent 21%,
        rgba(255,255,255,0.34) 34%, rgba(255,255,255,0.12) 42%,
        transparent 56%, transparent 100%),
    /* Layer 2: 原有底部辉光 */
    radial-gradient(ellipse at 50% 112%,
        rgba(255,255,255,0.22) 0%,
        color-mix(in srgb, var(--custom-color) 36%, transparent) 34%,
        transparent 72%),
    /* Layer 3: 径向焦散 — 新增：模拟光线穿过凸透镜在中心汇聚 */
    radial-gradient(ellipse at 50% 50%,
        rgba(255,255,255,0.18) 0%,
        transparent 55%),
    /* Layer 4: 底色渐变 */
    linear-gradient(180deg,
        color-mix(in srgb, var(--custom-color) 78%, var(--interactive-card-bg)) 0%,
        color-mix(in srgb, var(--custom-color) 96%, var(--interactive-card-bg)) 100%);
```
- `opacity` 从 `0 → 1`，过渡更干脆。
- `transform` 保持原有底部涌上的动画。

#### C. `::after`（高光反射层）增强
当前只有一条斜向高光。新增**反向二次反射**，模拟光线在玻璃背面再次反射：
```css
background:
    /* 原高光：从左上到右下 */
    linear-gradient(110deg, transparent 0%, transparent 36%,
        rgba(255,255,255,0.32) 46%, transparent 58%, transparent 100%),
    /* 新增：反向高光，从右下到左上，更锐利 */
    linear-gradient(290deg, transparent 0%, transparent 40%,
        rgba(255,255,255,0.14) 50%, transparent 60%, transparent 100%);
```
- hover 时不透明度从 `0.62` 提升到 `0.82`。
- 两条高光同时扫过，营造「多面折射」而非「单面涂层」。

#### D. 多层 `inset box-shadow`（厚度核心）
在 hover 态的 `box-shadow` 中追加 3 层内阴影，模拟厚玻璃的**边缘折射 + 内部体积感**：
```css
box-shadow:
    0 18px 34px rgba(0,0,0,0.16),                 /* 外部悬浮阴影 */
    0 0 0 3px color-mix(in srgb, var(--custom-color) 22%, transparent), /* 外轮廓 */
    0 10px 30px color-mix(in srgb, var(--custom-color) 28%, transparent), /* 外部光晕 */
    inset 0 0 16px rgba(255,255,255,0.22),         /* 内部柔光扩散 */
    inset 0 0 4px rgba(255,255,255,0.45),          /* 内边缘锐化高亮 */
    inset 0 -2px 4px color-mix(in srgb, var(--custom-color) 20%, transparent); /* 底部色彩聚焦 */
```

#### E. 动画微调
- `@keyframes social-prism-fill`：保留 0%→48%→100% 三段式，但把 `48%` 的 `scaleY(1.04)` 提升到 `1.08`，让「涌入」瞬间更有弹力，类似光线瞬间充满透镜。
- `transform: skewY(1deg)` 保持，增加微妙的不规则感。

### 3. Dark Mode 兼容性

当前 `components.css` 的 Dark Mode（`[data-theme='dark']`）对 `.social-link` **没有**单独覆盖，因此上述改动在 Dark Mode 下自然继承。由于多层 inset shadow 使用 `rgba(255,255,255, ...)`，在暗色背景下会表现为「内部高光」，与 Dock/Popup 的玻璃质感保持一致，无需额外调整。

### 4. 降级兼容

- 使用 `color-mix(in srgb, ...)` 的现代语法，浏览器不支持时回退到 `transparent` 或原有后备值。
- 所有新增 `inset box-shadow` 均为纯 CSS 层叠，不依赖 JS 或 `backdrop-filter`，IE/旧浏览器下退化为实色阴影，不影响可点击性。

## 验收标准

1. 未悬停时，`.social-link` 边框可见（3px），不像之前那样「细到几乎隐形」。
2. 悬停时，边框颜色更鲜明，边缘有厚度感（多层 inset shadow 造成的内部光晕）。
3. `::before` 的底色有中心汇聚的径向焦散，不只是「从下面涌上来的颜色」。
4. `::after` 有两条方向相反的高光条带扫过，产生多面反射的透镜感。
5. 整体不再像「塑料涂层卡片」，而更像「厚玻璃块被光从内部照亮」。
6. 动画过渡仍然流畅，`transition` 时长不变。
7. `lint` / `format:check` / `check` / `build` 全部通过。
