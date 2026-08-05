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
- 运行时：`wallpaper.apis` 竞态/重试；播放时用 Ken Burns 动效（`layout.css` / `--wallpaper-zoom-ms`）。
- 失败不能弄崩页面。

## 已知占位 / 保留契约

- Dock **设置**仍是占位（`href: '#'`，i18n 文案"即将推出"）——除非被要求，不要发明完整的设置 UI。
- `loading` 是保留配置契约；当前布局有意不加阻塞式加载遮罩。
