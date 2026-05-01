# ControlDock 视觉与交互升级设计

**日期**: 2026-05-01
**范围**: `ControlDock.tsx` + 相关 CSS / 布局

---

## 目标

当前 ControlDock 存在以下视觉和交互问题，本设计将逐一解决：

1. **白天模式模糊背景不自然**：目前半透明黑色压暗不够，白字在亮色壁纸前对比度不足
2. **弹出菜单简陋**：无过渡动画、无圆角精致感、无选中状态标记
3. **尺寸偏小、点击区域局促**：需要增大整体尺寸和触控面积
4. **缺乏 Hover "弹性放大"**：MacOS Dock 式的波浪放大是用户明确要求的交互亮点
5. **未充分利用 Astro 特性**：当前是纯 SolidJS 组件，应引入 Astro 的 CSS scoping、CSS 变量注入、View Transition

## 改进点总览

### 1. Liquid Glass 胶囊外观（白天模式 + 黑夜模式）

**设计理念**：参考 iOS 18 Liquid Glass（液态玻璃）—— 不是简单的毛玻璃，而是带有厚度感、高折射率的半透明材质。

- **backdrop-filter**: `blur(40px) saturate(220%)` — 显著加深模糊和饱和
- **白天背景**：`rgba(0, 0, 0, 0.42)`（更深的半透明黑色，确保白色图标清晰）
- **黑夜背景**：`rgba(255, 255, 255, 0.08)`（轻微增白，在纯黑背景上制造厚度）
- **边框**：`1px solid rgba(255, 255, 255, 0.22)` — 高亮边缘光
- **内发光**：`inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.3)` — 模拟玻璃折射的上亮下暗
- **外发光**：`0 8px 40px rgba(0, 0, 0, 0.35)` — 柔和的悬浮阴影

### 2. MacOS Dock 弹性 Hover（"波浪放大"）

**设计理念**：参考 macOS Dock 的鼠标悬停放大 —— 不仅当前图标放大，邻近图标也根据距离递减放大，形成平滑的"隆起波浪"。

**实现方式**：
- 监听 `mousemove` 在 dock 胶囊容器上
- 计算鼠标 X 坐标到每个图标中心的**绝对距离**
- 每个图标的放大倍数：`scale = 1 + 0.5 * exp(-distance² / (2 * 60²))`
- 即最大放大到 **1.5 倍**（50%放大），影响半径约 **120px**
- 用 `transform: scale(x)` 和 `margin` 调整避免重叠
- **离开 dock 时**：所有图标平滑回弹到 `scale(1)`，缓动时间为 `0.4s cubic-bezier(0.16, 1, 0.3, 1)`
- 相邻图标同时缩小产生"凹陷"效果（非选中项自动缩小到 0.8-0.9）

### 3. 增大整体尺寸

| 元素 | 当前 | 新尺寸 |
|------|------|--------|
| 胶囊 padding | `0 12px` | `0 16px` |
| 图标容器 | `36px × 36px` | `48px × 48px` |
| 图标字体大小 | `13px` | `16px` |
| 胶囊 border-radius | `26px` | `32px` |
| 分隔线高度 | `20px` | `28px` |

### 4. 弹出菜单升级

**PC 端 dock-popup**：
- ✅ **进入动画**：`opacity: 0 + translateY(6px) + scale(0.96) → opacity: 1 + translateY(0) + scale(1)`，时长 `0.25s`，缓动 `cubic-bezier(0.16, 1, 0.3, 1)`
- ✅ **退出动画**：反向播放
- ✅ **顶部小横线**（拖动指示条）：`40px × 4px` 的圆角横线，颜色 `rgba(255,255,255,0.3)`
- ✅ **选中项**：左侧出现蓝色 ✓ 标记 + 背景高亮 `rgba(79,195,247,0.15)`
- ✅ **圆角**：从 `12px` 提升到 `16px`
- ✅ **背景**：同步使用 Liquid Glass（更深的模糊）

**移动端 bottom-sheet**：
- ✅ **进入动画**：从底部 `translateY(100%) → translateY(0)`，时长 `0.35s cubic-bezier(0.16, 1, 0.3, 1)`
- ✅ **退出动画**：反向
- ✅ **背景遮罩**：`rgba(0,0,0,0.5) → rgba(0,0,0,0)` 淡出
- ✅ **顶部小横线 + 标题居中对齐**
- ✅ **选中项带 ✓**

### 5. 充分利用 Astro 特性

**A. CSS Scoping 与变量注入**：
- 将 ControlDock 的所有专属样式从全局 `components.css` 迁移到 `ControlDock.astro` 的 `<style>` 标签中（Astro 会自动 scope 到组件）
- 通过 `define:vars` 将当前 theme（`light`/`dark`）作为 CSS 变量注入，实现无闪烁的初始主题渲染
- 这样 dock 样式与其他组件完全隔离，避免 CSS 全局污染

**B. CSS-driven State Animation**：
- SolidJS 组件不再直接设置样式，而是通过 `setAttribute('data-open', '')` 和 `setAttribute('data-theme', 'dark')` 驱动 CSS transition
- 所有进入/退出动画完全由 CSS `:is([data-open])` 选择器控制
- 好处：动画可以脱离 JS 主线程，更流畅；也更容易调试

**C. View Transitions API（用于主题切换）**：
- 当用户点击主题按钮时，调用 `document.startViewTransition(() => applyTheme(newTheme))`
- 浏览器会自动创建一个共享元素过渡动画，胶囊和图标平滑渐变成新配色
- 这是 Astro 内置支持的浏览器 API，不需要额外库

## 结构变化

```
src/components/
  ControlDock.tsx          → 保留纯逻辑（SolidJS signals + view transition）
  ControlDock.astro        → 新增：样式容器 + define:vars + <style scoped>
```

在 `HomepageApp.tsx` 中：
```tsx
import ControlDockAstro from './ControlDock.astro';
// ...
<ControlDockAstro config={siteConfig} />
```

`ControlDock.astro` 负责：
1. 接收 `config` prop（通过 Astro props）
2. `<style define:vars={{ initialTheme, dockBgLight, dockBgDark }}>`
3. 渲染 `<div id="control-dock-root" data-theme={initialTheme}>`
4. 内部嵌入 `<ControlDock client:load config={...} />`（SolidJS 继续负责状态）

这样 SolidJS 组件的 JS bundle 只包含逻辑（信号、事件处理），CSS 完全由 Astro 处理。

## 暗色模式兼容

所有新样式都包含 `[data-theme='dark']` 变体：

- `dock-bg-dark`: `rgba(255,255,255,0.08)` + `backdrop-filter: blur(40px)`
- `dock-border-dark`: `1px solid rgba(255,255,255,0.12)`
- `dock-item-hover-dark`: `background: rgba(255,255,255,0.15)`

确保白天和黑夜都保持 Liquid Glass 效果，只是底色不同。

## 风险评估

1. **MacOS Dock 波浪效果在移动端的性能**：使用 `transform` 不会有重排问题，GPU 加速；但需在 touch 设备禁用（移动端不需要 hover）
2. **View Transitions API 兼容性**：在 `document.startViewTransition` 不可用时 gracefully degrade（直接切换，无动画）
3. **Astro scoped style 与 SolidJS hydration**：确保 Astro 的 scoped class 在 hydration 后不会丢失（SolidJS 渲染会替换 DOM，需要把 scoped style 放在外层 wrapper）

## 测试清单

- [ ] 白天模式：胶囊在亮色壁纸上清晰可见，白色图标对比度 ≥ 4.5:1
- [ ] 黑夜模式：胶囊在暗色壁纸上仍有厚度感，不消失
- [ ] PC hover：鼠标划过时图标产生波浪放大，离开后平滑回弹
- [ ] PC 菜单：点击语言按钮，菜单从底部弹出，有过渡动画，选中中文时出现 ✓
- [ ] 移动端：点击语言按钮，底部 sheet 滑出，有过渡动画，背景遮罩淡入淡出
- [ ] 主题切换：点击太阳/月亮按钮，胶囊颜色平滑过渡（View Transition）
- [ ] 所有现有测试（36个）保持通过

---

**下一步**: 用户确认本设计方案后，创建实现计划。
