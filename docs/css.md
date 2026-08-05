# CSS

## 导入顺序

`BaseLayout.astro` 里的导入顺序就是加载顺序（不要随意调整）：

`base → layout → transitions → components → responsive → dock → topbar → footer → article → toc`

## 设计令牌

优先用现有令牌，别发明新的卡片体系：

- `--panel-*`
- `--glass-*`
- `--font-serif` / `--font-ui` / `--font-mono`
- `--curve-delicate`
