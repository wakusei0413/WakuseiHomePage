# Wakusei HomePage

这是一个基于 Astro、SolidJS 和 TypeScript 的单页静态主页项目，继续以纯静态资源的方式部署到 Cloudflare Pages。

![主页截图](docs/assets/screenshots/homepage-01.png)

## 技术栈

- Astro 5
- SolidJS
- TypeScript
- Zod
- ESLint
- Prettier

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址是 `http://localhost:4321`。

## 构建与预览

```bash
npm run lint
npm run format:check
npm test
npm run check
npm run build
npm run serve
```

- `npm run build` 会把静态文件输出到 `dist/`
- `npm run serve` 会用静态服务器预览 `dist/`

## 部署说明

Cloudflare Pages 继续按照纯静态站点方式部署即可：

- 构建命令：`npm run build`
- 输出目录：`dist`

不需要 Astro SSR、Functions 或额外后端服务。

## 内容修改入口

现在日常内容编辑主要集中在：

- `src/data/customize.ts`

这里可以直接修改：

- `profile`：头像、名字、状态
- `socialLinks`：社交链接、图标、颜色
- `slogans`：打字机文案和切换节奏
- `time`：12/24 小时制、日期显示
- `loading`：加载中轮播文案
- `wallpaper`：壁纸接口和滚动参数

运行时相关文件：

- `src/data/site.ts`：应用实际读取的校验后配置
- `src/data/schema.ts`：Zod 配置结构校验
- `src/data/README.md`：配置项速查说明

## 静态资源

静态资源位于：

- `public/res/`

当前头像路径仍保持为 `/res/img/logo.png`，对外访问路径不变。

## 目录结构

```text
src/
  components/
  data/
  layouts/
  lib/
  pages/
  types/
public/
  res/
css/
tests/
```

## 说明

- 页面保持单页结构
- 旧的 `config.js`、`index.html`、`js/app.js` 自定义运行时已经移除
- 不再维护 `nomodule`、`legacy.js` 这条旧浏览器回退链路
