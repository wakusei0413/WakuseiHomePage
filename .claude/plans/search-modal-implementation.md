# 搜索模态框改造实施计划

## 目标
将搜索从独立页面 `/search` 改造成全局可调用的模态对话框，点击导航栏搜索图标即可弹出，支持快捷键 `Cmd/Ctrl + K` 唤起。

## 架构设计

### 1. 组件结构
```
SearchModal.vue (新建)
├── 模态框容器 (背景遮罩 + 弹窗，使用 Teleport)
├── 搜索输入框 (自动聚焦，支持 ESC 清空/关闭)
├── 结果列表 (复用 PostCard 展示)
└── 空状态提示
```

### 2. 状态管理
```typescript
// src/stores/search.ts (新建)
export const useSearchStore = defineStore('search', () => {
    const isOpen = ref(false);
    
    function open() { isOpen.value = true; }
    function close() { isOpen.value = false; }
    function toggle() { isOpen.value = !isOpen.value; }
    
    return { isOpen, open, close, toggle };
});
```

### 3. 数据加载策略
- **懒加载**：首次打开模态框时才动态加载搜索索引
- **缓存**：加载后保存在组件内存中，避免重复请求
- **代码分割**：使用动态 import `await import('../lib/posts')`

### 4. 交互设计
- **打开方式**：
  - 点击 TopBar 搜索按钮
  - 全局快捷键 Cmd/Ctrl + K
- **关闭方式**：
  - ESC 键（查询为空时关闭，有查询时先清空）
  - 点击背景遮罩
  - 点击搜索结果跳转后自动关闭
- **动画**：fade in/out + scale(0.95 → 1)
- **响应式**：桌面端居中弹窗，移动端全屏显示

## 实施步骤

### Step 1: 创建搜索 Store
**文件**: `src/stores/search.ts`

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSearchStore = defineStore('search', () => {
    const isOpen = ref(false);

    function open() {
        isOpen.value = true;
    }

    function close() {
        isOpen.value = false;
    }

    function toggle() {
        isOpen.value = !isOpen.value;
    }

    return { isOpen, open, close, toggle };
});
```

### Step 2: 创建 SearchModal 组件
**文件**: `src/components/SearchModal.vue`

**关键特性**：
- 基于 `SearchPage.vue` 改造，保留完整搜索逻辑
- 使用 `<Teleport to="body">` 渲染到 body
- 懒加载搜索索引：`const { loadSearchIndex } = await import('../lib/posts')`
- 打开时自动聚焦输入框：`onMounted(() => searchInput.value?.focus())`
- ESC 键行为：有查询时清空，无查询时关闭模态框
- 点击背景遮罩关闭：`@click.self` 监听遮罩点击
- 点击搜索结果后关闭模态框并导航
- 添加 i18n 支持，硬编码文案改为 `t('search.xxx')`

**样式要点**：
- 模态框遮罩：`position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px)`
- 弹窗容器：居中，最大宽度 700px，圆角 8px，阴影，响应式全屏
- 动画：v-if 触发 transition，fade + scale

### Step 3: 更新 TopBar 支持搜索 action
**文件**: `src/components/TopBar.vue`

**修改点**：
1. 导入 `useSearchStore`：`import { useSearchStore } from '../stores/search';`
2. 初始化 store：`const searchStore = useSearchStore();`
3. 在 `handleAction` 中添加 case：
   ```typescript
   case 'openSearch':
       searchStore.open();
       break;
   ```
4. 在 `handleSidebarDockLinkClick` 关闭侧边栏后也支持打开搜索

### Step 4: 更新配置将搜索改为 action
**文件**: `src/data/customize.ts`

**修改 dock.items**：
```typescript
{
    type: 'action',
    action: 'openSearch',
    display: {
        icon: 'fa-solid fa-magnifying-glass',
        i18nKey: 'dock.search'
    }
}
```

### Step 5: 在 SiteShell 中挂载 SearchModal
**文件**: `src/components/SiteShell.vue`

**修改点**：
1. 导入组件：`import SearchModal from './SearchModal.vue';`
2. 导入 store：`import { useSearchStore } from '../stores/search';`
3. 初始化 store：`const searchStore = useSearchStore();`
4. 在 template 底部添加：
   ```vue
   <SearchModal v-if="searchStore.isOpen" />
   ```
5. 注册全局快捷键（Cmd/Ctrl + K）：
   ```typescript
   onMounted(() => {
       const handleKeyDown = (e: KeyboardEvent) => {
           if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
               e.preventDefault();
               searchStore.toggle();
           }
       };
       document.addEventListener('keydown', handleKeyDown);
       pageCleanups.push(() => document.removeEventListener('keydown', handleKeyDown));
   });
   ```

### Step 6: 添加模态框样式
**文件**: `src/styles/components.css`

**新增样式**（在文件末尾添加）：
```css
/* ===== 搜索模态框 ===== */
.search-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 80px 20px 20px;
    overflow-y: auto;
}

.search-modal-dialog {
    background: var(--bg);
    border: var(--border-width) solid var(--panel-border);
    border-radius: 8px;
    box-shadow: var(--panel-shadow);
    width: 100%;
    max-width: 700px;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    animation: search-modal-enter 0.2s var(--curve-delicate);
}

@keyframes search-modal-enter {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.search-modal-header {
    padding: 24px;
    border-bottom: var(--border-width) solid var(--panel-border);
}

.search-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

/* 移动端全屏显示 */
@media (max-width: 900px) {
    .search-modal-overlay {
        padding: 0;
        align-items: stretch;
    }
    
    .search-modal-dialog {
        max-width: none;
        max-height: none;
        height: 100vh;
        border-radius: 0;
    }
}

/* 暗色模式 */
[data-theme='dark'] .search-modal-overlay {
    background: rgba(0, 0, 0, 0.7);
}
```

### Step 7: 添加 i18n 翻译
**文件**: `src/data/i18n.ts`

**新增翻译键**（在每个语言对象中添加）：
```typescript
'zh-CN': {
    // ... 现有翻译
    'search.title': '搜索文章',
    'search.placeholder': '搜索标题、摘要、正文...',
    'search.clear': '清空',
    'search.help': '支持中文、英文和多关键词；多个关键词需要同时命中。',
    'search.summary.total': '共 {count} 篇文章',
    'search.summary.results': '找到 {count} 篇结果',
    'search.empty': '没有找到匹配的文章。',
    'search.retry': '重新搜索',
    'search.snippet.description': '摘要命中',
    'search.snippet.body': '正文命中'
},
'en': {
    // ... 现有翻译
    'search.title': 'Search Articles',
    'search.placeholder': 'Search title, description, body...',
    'search.clear': 'Clear',
    'search.help': 'Supports Chinese, English and multiple keywords; all keywords must match.',
    'search.summary.total': '{count} articles total',
    'search.summary.results': '{count} results found',
    'search.empty': 'No matching articles found.',
    'search.retry': 'Search again',
    'search.snippet.description': 'Description match',
    'search.snippet.body': 'Body match'
},
'ja': {
    // ... 现有翻译
    'search.title': '記事を検索',
    'search.placeholder': 'タイトル、概要、本文を検索...',
    'search.clear': 'クリア',
    'search.help': '中国語、英語、複数キーワードに対応；すべてのキーワードが一致する必要があります。',
    'search.summary.total': '全{count}件の記事',
    'search.summary.results': '{count}件の結果が見つかりました',
    'search.empty': '一致する記事が見つかりませんでした。',
    'search.retry': '再検索',
    'search.snippet.description': '概要一致',
    'search.snippet.body': '本文一致'
}
```

### Step 8: 更新 Footer 链接（可选）
**文件**: `src/data/customize.ts`

将 footer 中的搜索链接改为触发模态框的按钮（可选，也可以保持原样让 footer 的搜索链接继续跳转到 /search 页面作为 fallback）。

## 技术约束

1. **代码风格**：必须遵循现有项目规范
   - Vue 3 Composition API + `<script setup>`
   - TypeScript 严格模式
   - 4 空格缩进，单引号，必须有分号
   - 使用 `ref`/`computed`/`watch`/`onMounted`/`onUnmounted`

2. **性能要求**：
   - 搜索索引必须懒加载：`const { loadSearchIndex } = await import('../lib/posts')`
   - 加载后缓存在组件中：`const cachedEntries = ref<SearchIndexEntry[] | null>(null)`
   - 仅在首次打开时加载

3. **可访问性**：
   - 模态框需要 `role="dialog"` `aria-modal="true"`
   - 输入框需要 `aria-label`
   - 支持键盘导航（ESC 关闭/清空）

4. **兼容性**：
   - 桌面端和移动端响应式
   - 暗色模式支持
   - 使用 Teleport 避免 z-index 问题

## 验证清单

- [ ] Cmd/Ctrl + K 能打开搜索模态框
- [ ] 点击 TopBar 搜索按钮能打开
- [ ] 移动端侧边栏点击搜索能打开
- [ ] ESC 键先清空查询，再关闭模态框
- [ ] 点击背景遮罩能关闭
- [ ] 搜索功能正常工作（匹配标题、摘要、正文）
- [ ] 点击结果能跳转并关闭模态框
- [ ] 移动端全屏显示正常
- [ ] 暗色模式显示正常
- [ ] 动画流畅自然
- [ ] 没有 TypeScript 错误
- [ ] 没有 ESLint 错误
- [ ] `npm run build` 构建成功
- [ ] 所有现有测试通过

## 实施顺序

1. ✅ 创建 `src/stores/search.ts`
2. ✅ 创建 `src/components/SearchModal.vue`
3. ✅ 更新 `src/components/TopBar.vue`
4. ✅ 更新 `src/data/customize.ts`
5. ✅ 更新 `src/components/SiteShell.vue`
6. ✅ 添加 `src/styles/components.css` 样式
7. ✅ 更新 `src/data/i18n.ts` 翻译
8. ✅ 验证所有功能
9. ✅ 运行 lint 和 build

## 参考文件

- `src/components/SearchPage.vue` - 搜索逻辑和 UI
- `src/lib/search.ts` - 搜索算法
- `src/stores/theme.ts` - Store 模式参考
- `src/components/TopBar.vue` - 导航栏和 action 处理
- `src/components/SiteShell.vue` - 全局壳层和事件监听
- `src/styles/topbar.css` - popup 样式参考
