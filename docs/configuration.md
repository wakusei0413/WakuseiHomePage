# 配置指南 (Configuration Guide)

项目的全部个性化配置均遵循一条清晰的单向数据流：

```
src/data/customize.ts  →  src/types/site.ts（类型） + src/data/schema.ts（Zod 校验）  →  siteConfig
```

---

## 🌟 核心原则（日常必读）

- **日常文案 / 链接 / 颜色 / 壁纸 / 导航**：**只需要修改 `src/data/customize.ts`** 一个文件即可！
- `customize.ts` 只导出 `editableSiteConfig` 对象，所有字段均拥有严格的 TypeScript 类型提示与 Zod 校验。

---

## 💡 小白常见修改场景 Q&A

### Q1: 如何修改我的昵称、头像和个人一句话介绍？
在 `src/data/customize.ts` 中找到 `profile` 节点：
```typescript
profile: {
    name: '你的昵称',
    avatar: '/res/img/logo.png', // 可以把自己的头像图片丢到 public/res/img/ 下
    description: '一名热爱探索的技术博主',
    status: '在线 coding 中 🚀'
}
```

### Q2: 怎么修改首页滚动播放的标语？
在 `src/data/customize.ts` 中找到 `slogans` 节点：
```typescript
slogans: {
    list: [
        '第一句标语',
        '第二句标语',
        '用冰冷的理性温暖世界。'
    ],
    mode: 'sequence',     // 'sequence' 按顺序播放，或 'random' 随机播放
    pauseDuration: 5000,  // 每条标语停留毫秒数（5000 代表 5 秒）
    loop: true            // 是否循环播放
}
```

### Q3: 怎么添加我的 B站、GitHub、微信或邮箱？
在 `src/data/customize.ts` 中找到 `socialLinks` 数组，自由增减：
```typescript
socialLinks: [
    {
        name: 'GitHub',
        icon: 'fa-brands fa-github',      // 图标类名（由 Icon.vue 内联渲染）
        url: 'https://github.com/你的用户名',
        color: '#24292e'
    },
    {
        name: 'Bilibili',
        icon: 'fa-brands fa-bilibili',
        url: 'https://space.bilibili.com/你的UID',
        color: '#00aeec'
    },
    {
        name: 'Email',
        icon: 'fa-solid fa-envelope',
        url: 'mailto:your-email@example.com',
        color: '#ea4335'
    }
]
```

### Q4: 我只想用一张固定的高清壁纸，不想要自动轮播换图？
在 `src/data/customize.ts` 中找到 `wallpaper`，将 `rotation.enabled` 设为 `false`，并清空 `apis`：
```typescript
wallpaper: {
    defaultImage: '/res/img/wallpaper/default.webp', // 你的本地默认壁纸
    apis: [], // 清空外部接口即可停用外链拉取
    raceTimeout: 10000,
    maxRetries: 5,
    rotation: {
        enabled: false, // 设为 false 停用轮播
        interval: 60000
    }
}
```
> 💡 **更换默认壁纸**：直接将你喜欢的图片转换为 WebP 格式，覆盖到项目中的 `public/res/img/wallpaper/default.webp` 即可。

### Q5: 为什么首页左侧的 GitHub 提交格子图显示别人的？
在 `src/data/customize.ts` 中找到 `github`，换成你自己的 GitHub 用户名：
```typescript
github: {
    username: '你的GitHub用户名',
    url: 'https://github.com/你的GitHub用户名'
}
```
构建时，系统会自动抓取该用户的 53 周公开提交数据。如果用户名为不存在的账户或遇到网络超时，页面将优雅降级为一行简洁的 GitHub 个人主页链接。

### Q6: 顶栏（TopBar）导航按钮怎么自定义？
在 `src/data/customize.ts` 中找到 `dock.items`。支持四种类型：
1. `type: 'link'`：页面或外部链接（如 `/archives`, `/about`）。
2. `type: 'action'`：内置动作（如 `action: 'toggleTheme'` 切换明暗主题，`action: 'openSearch'` 打开搜索弹窗）。
3. `type: 'panel'`：内置弹出面板（如 `panel: 'language'` 语言切换面板）。
4. `type: 'divider'`：分割线。

```typescript
dock: {
    items: [
        {
            type: 'link',
            href: '/',
            display: { icon: 'fa-solid fa-house', i18nKey: 'dock.home', renderMode: 'text' }
        },
        {
            type: 'link',
            href: '/#posts',
            display: { icon: 'fa-solid fa-newspaper', i18nKey: 'dock.blog', renderMode: 'text' }
        },
        {
            type: 'link',
            href: '/archives',
            display: { icon: 'fa-solid fa-layer-group', i18nKey: 'dock.topics', renderMode: 'text' }
        },
        { type: 'divider' },
        {
            type: 'action',
            action: 'toggleTheme',
            display: { icon: 'fa-solid fa-moon', iconActive: 'fa-solid fa-sun', i18nKey: 'dock.theme' }
        },
        {
            type: 'panel',
            panel: 'language',
            display: { icon: 'fa-solid fa-globe', i18nKey: 'dock.language' }
        },
        {
            type: 'action',
            action: 'openSearch',
            display: { icon: 'fa-solid fa-magnifying-glass', i18nKey: 'dock.search' }
        }
    ]
}
```

---

## 🛠️ 开发者进阶：新增配置字段与新增语言

### 1. 新增一个配置字段
如果您需要扩展新的配置，需要三处联动修改：
1. **定义类型**：在 `src/types/site.ts` 对应的 interface 中添加类型定义。
2. **定义校验规则**：在 `src/data/schema.ts` 中添加对应的 Zod 规则（如 `z.string()` 或 `z.boolean()`）。
3. **提供默认值**：在 `src/data/customize.ts` 的 `editableSiteConfig` 中补充默认值。

### 2. 新增一种语言支持
1. 在 `src/data/i18n.ts` 中新增语言的全部键值对字典。
2. 在 `src/data/customize.ts` 的 `i18n.locales` 列表中加入新语言标识（如 `fr`、`de` 等）。
3. 在 `src/types/site.ts` 中的 `Locale` 类型联合体中加入对应字面量。
4. 运行 `npm test`，单元测试会自动校验所有语言的翻译键是否完全对齐无遗漏。

---

## 🔒 已知占位与保留契约

- **Dock 设置入口**：默认已从 `customize.ts` 中精简移除；如无特定需求，无需自行配置设置项。
- **`loading` 字段**：为预留配置契约。当前架构采用极速首屏直出，有意不挂载阻塞全屏的 Loading 遮罩。
- **`version` 字段**：会作为 `v2.0.1` 显示在页脚右下角（悬停可见完整标题）；不需要可留空字符串。
- **搜索页查询参数**：`/search?q=关键词` 可直接进入带结果的搜索页，输入时地址栏会实时同步该参数（使用 `replaceState`，不会污染浏览器历史）。顶栏搜索弹窗的「查看全部结果」就是跳转到该地址。
