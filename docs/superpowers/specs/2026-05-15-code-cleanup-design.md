# 代码精简设计文档

## 概述

对 Wakusei 个人主页代码库进行全面精简，移除死代码、重复规则、未用依赖，优化整体代码质量。预计减少约 890+ 行代码，移除 8 个 npm 包，删除 9 个死文件。

## 审计发现

### 1. 死 Composables（4 个文件，~92 行）

| 文件 | 行数 | 原因 |
|---|---|---|
| `src/composables/useEffects.ts` | 27 | 从未被导入，SiteShell.vue 直接调用 runtime-effects.ts |
| `src/composables/useWallpaper.ts` | 59 | 从未被导入，SiteShell.vue 内联实现了相同逻辑 |
| `src/composables/useDock.ts` | 1 | 仅 re-export lib/dock.ts，TopBar.vue 直接从 lib 导入 |
| `src/composables/useLogger.ts` | 5 | 仅被 useWallpaper.ts（死代码）使用，1 行 passthrough |

### 2. 未引用组件（1 个文件，~22 行）

| 文件 | 行数 | 原因 |
|---|---|---|
| `src/components/ClockPanel.vue` | 22 | 无任何 Vue 组件或 Astro 页面导入 |

### 3. 废弃 CSS 目录（4 个文件，~4 行）

| 目录 | 原因 |
|---|---|
| `css/` (base.css, components.css, layout.css, responsive.css) | 1 行 @import shim，无任何文件从 css/ 导入 |

### 4. 未用 npm 包（8 个包）

| 包名 | 原因 |
|---|---|
| `@swup/a11y-plugin` | 项目已迁移到 astro:transitions，零引用 |
| `@swup/astro` | 同上 |
| `@swup/head-plugin` | 同上 |
| `@swup/preload-plugin` | 同上 |
| `@swup/scripts-plugin` | 同上 |
| `@swup/scroll-plugin` | 同上 |
| `swup` | 同上 |
| `@fortawesome/fontawesome-free` | 图标已内联到 Icon.vue，零引用 |

### 5. CSS 死选择器（~450+ 行）

#### dock.css（~121 行）
- `.nav-dock`, `.nav-dock-item`, `.nav-dock-divider` 等全部类名无任何 Vue 模板使用
- 项目已迁移到 TopBar.vue 使用 `.top-bar-dock-item` 类
- 保留 `.sidebar-menu-item`, `.sidebar-submenu-item`（可能被 MobileDockSidebar 使用）

#### components.css 死选择器
| 选择器 | 行数 | 原因 |
|---|---|---|
| `.wallpaper-toggle` | ~50 | 默认 display:none，无代码添加 .active 类 |
| `.close-panel` | ~45 | 同上 |
| `.legacy-compat` 块 | ~70 | 无代码添加 .legacy-compat 类到 html/body |
| `.no-object-fit` | ~10 | 无代码添加此类 |
| `.footer-left`, `.footer-line`, `.footer-text` | ~30 | Footer.vue 使用不同的 class 名 |
| `.wallpaper-container` | ~3 | 无 HTML 元素使用此类 |
| `.time-widget` (transition) | ~3 | 无元素使用此类 |
| `.blog-content` (transitions.css) | ~8 | 无模板使用此类 |
| `.placeholder-content` (transitions.css) | ~15 | 无模板使用此类 |

### 6. CSS 重复规则（~200 行）

#### base.css 重复
| 选择器 | 出现次数 | 行号 |
|---|---|---|
| `html::-webkit-scrollbar` | 2 | 152-154, 170-172 |
| `body` | 2 | 156-168, 174-186 |

#### components.css 重复
| 选择器 | 出现次数 | 行号 |
|---|---|---|
| `.loading-spinner` | 3 | 80-86, 111-117, 176-186 |
| `.loading-progress` | 3 | 89-97, 145-153, 211-220 |
| `.loading-bar` | 2 | 155-162, 222-230 |
| `.loading-text` | 2 | 134-142, 198-208 |
| `.loading-panel` | 2 | 66-77, 129-131 |
| `@keyframes loading-rotate` | 2 | 119-126, 188-195 |
| `.avatar-box` | 2 | 7-9, 256-285 |
| `.name` | 2 | 309-321 |
| `.status-bar` | 3 | 330-345, 987-1003 |
| `.status-dot` | 4 | 347-354, 399-406, 408-418, 1005-1013 |
| `.status-text` | 3 | 372-375, 436-440, 1031-1034 |
| `.bio-container` | 4 | 378-388, 443-455, 1037-1046 |
| `.bio` | 3 | 390-397, 457-466, 1048-1055 |
| `@keyframes pulse` | 4 | 362-370, 426-434, 1021-1029 |
| `.footer-left` / `.footer-line` / `.footer-text` | 2 | 609-636, 1085-1106 |
| `@media prefers-reduced-motion` | 3 | 955-960, 1135-1140, 1222-1227 |

**合并策略**：保留每个选择器的最后一次定义（CSS 层叠规则，最后定义的胜出），删除前面的重复。

### 7. 未用 Store 方法（~5 行）

| 位置 | 方法 | 原因 |
|---|---|---|
| `src/stores/theme.ts` + `src/composables/useTheme.ts` | `syncFromStorage()` | 定义但从未被任何组件调用 |

## 执行步骤

### Step 1: 删除死文件
- `rm src/composables/useEffects.ts`
- `rm src/composables/useWallpaper.ts`
- `rm src/composables/useDock.ts`
- `rm src/composables/useLogger.ts`
- `rm src/components/ClockPanel.vue`
- `rm -rf css/`

### Step 2: 清理 package.json
移除以下 dependencies：
```
@fortawesome/fontawesome-free
@swup/a11y-plugin
@swup/astro
@swup/head-plugin
@swup/preload-plugin
@swup/scripts-plugin
@swup/scroll-plugin
swup
```

### Step 3: 清理 CSS 死选择器
- 删除 `src/styles/dock.css` 中 `.nav-dock` 相关规则（保留 `.sidebar-menu-item` / `.sidebar-submenu-item`）
- 删除 `src/styles/components.css` 中 `.wallpaper-toggle`, `.close-panel`, `.legacy-compat`, `.no-object-fit`, `.footer-left/line/text`, `.wallpaper-container`, `.time-widget`
- 删除 `src/styles/transitions.css` 中 `.blog-content`, `.placeholder-content`（如果确认无模板使用）

### Step 4: 合并 CSS 重复规则
- `base.css`: 删除 170-186 行（重复的 scrollbar 和 body）
- `components.css`: 对每个重复选择器，保留最后定义，删除前面的

### Step 5: 清理未用代码
- 从 `src/stores/theme.ts` 删除 `syncFromStorage` 函数和 return 中的导出
- 从 `src/composables/useTheme.ts` 删除 `syncFromStorage` 方法和 return 中的导出

## 风险评级

| 步骤 | 风险 | 可回滚 |
|---|---|---|
| Step 1 | 零风险 | 是（git checkout） |
| Step 2 | 零风险 | 是 |
| Step 3 | 低风险（CSS 选择器无引用） | 是 |
| Step 4 | 中风险（需确保保留最后定义） | 是 |
| Step 5 | 低风险 | 是 |

## 验证

执行后运行：
```
npm run lint
npm run format:check
npm run test
npm run check
npm run build
```

全部通过方可视为成功。
