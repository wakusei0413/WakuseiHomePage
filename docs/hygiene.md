# 仓库卫生

## 已 gitignore 的工具垃圾

`tmp/`、`output/`、`.playwright-cli/`、`terminals/`、`agent-tools/`、`dist/`、`.astro/`、`.reasonix/`、`.opencode/`、`.codex/environments/`。

**不要提交临时调试截图、Lighthouse JSON、迁移辅助脚本。** `docs/assets/screenshots/` 下用于 README 展示的成品截图是例外，有意保留。

## 图标

- `Icon.vue` 把 FA 类名映射为内联 SVG（不引入 Font Awesome 包）。

## 旧内容迁移

- 旧 Hexo HTML → MD 有损；批量导入后要手工修。
- 一次性脚本不要进入随产品发布的仓库树。
