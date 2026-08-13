# 配置链

```
src/data/customize.ts  →  site.ts (Zod via schema.ts)  →  siteConfig
```

## 规则

- 日常文案/链接/颜色/壁纸/Dock：**只改** `customize.ts`。
- `customize.ts` 只导出 `editableSiteConfig`；不要加便捷投影或第二个可编辑配置门面。

## 新增字段

`types/site.ts` + `schema.ts` + `customize.ts` 一起改。

## 新增语言

`data/i18n.ts` + `customize.ts` 的 `i18n.locales` + `types/site.ts` 的 `Locale`（测试要求键一一对应）。

## 主题

- `<html data-theme="light|dark">`；head 脚本读取 `localStorage.theme`（防 FOUC）。

## 壁纸

- 默认：`public/res/img/wallpaper/default.webp`。保持 WebP；原地替换。
- 运行时：`wallpaper.apis` 竞态/重试；播放时用 Ken Burns 呼吸缩放（`wallpaper-scroller.ts` 的 Web Animations API，切换时新帧接管旧帧缩放相位，无跳变；`layout.css` 只负责 opacity 交叉淡入）。
- 失败不能弄崩页面。

## GitHub 贡献图

- 左侧面板的格子图：**构建时**抓取 `https://github-contributions-api.jogruber.de/v4/{username}?y=last`（无需 token），由 `src/pages/github-contributions.json.ts` 端点输出为静态 `/github-contributions.json`；客户端只读站内快照，不再直连第三方。
- 日常只改 `customize.ts` 的 `github`：`username`（API 查询参数）与 `url`（整卡点击跳转目标，新标签页打开）。
- 外部 API 失败/超时时构建不中断，输出空数据，页面降级为一行 GitHub 链接（与壁纸同一容错约定）。
- 逻辑集中在 `src/lib/github-contributions.ts`（解析容错 + 53 列矩阵构建），组件只负责渲染。

## 已知占位 / 保留契约

- Dock **设置**仍是占位（`href: '#'`，i18n 文案"即将推出"）——除非被要求，不要发明完整的设置 UI。
- `loading` 是保留配置契约；当前布局有意不加阻塞式加载遮罩。
