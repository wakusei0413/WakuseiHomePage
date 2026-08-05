# 仓库卫生

## 已 gitignore 的工具垃圾

`tmp/`、`output/`、`.playwright-cli/`、`terminals/`、`agent-tools/`、`dist/`、`.astro/`。

**不要把截图、Lighthouse JSON、迁移辅助脚本当产品提交。**

## 图标

- `Icon.vue` 把 FA 类名映射为内联 SVG（不引入 Font Awesome 包）。

## 旧内容迁移

- 旧 Hexo HTML → MD 有损；批量导入后要手工修。
- 一次性脚本不要进入随产品发布的仓库树。
