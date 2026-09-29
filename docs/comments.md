# 评论与浏览量 (Comments)

文章评论和浏览量使用 [Twikoo](https://twikoo.js.org)。后端部署在**你自己的 Cloudflare 账号**里（Workers + D1），站点本身仍然是纯静态的。

- 免费额度用完时，请求会直接失败，**不会自动产生费用**。个人博客的访问量离上限很远。
- 不需要 VPS，也不需要 Vercel。
- 访客可以匿名评论。正常评论直接发布；被判定为垃圾的评论（命中违禁词或被 AI 判定）会**自动隐藏**，你事后在后台复核就行，不需要逐条审核。

---

## 一、部署后端（只需做一次）

需要 Node.js 和 pnpm。以下命令来自 Twikoo 官方文档的 Cloudflare 部署章节，以官方最新版本为准。

```bash
git clone https://github.com/twikoojs/twikoo.git
cd twikoo
pnpm install
pnpm -r --filter '@twikoojs/cloudflare...' build

cd packages/server-cloudflare
npx wrangler login
```

在 `packages/server-cloudflare` 下新建 `wrangler.toml`：

```toml
name = "twikoo"
main = "dist/index.js"
compatibility_date = "2026-09-01"
compatibility_flags = ["nodejs_compat"]   # 必须

[[d1_databases]]
binding = "DB"
database_name = "twikoo"
database_id = "<下一步输出的 id>"
```

```bash
npx wrangler d1 create twikoo                                  # 把输出的 database_id 填回上面
npx wrangler d1 execute twikoo --remote --file=./schema.sql
npx wrangler deploy
```

部署完成后会得到 `https://twikoo.<你的用户名>.workers.dev`。**`workers.dev` 域名在国内无法访问**，所以要绑定自己的域名：Cloudflare 后台 → Workers → twikoo → 设置 → 域和路由 → 添加「自定义域」，例如 `comment.wakusei.top`。

## 二、接到站点上

1. 在 `src/data/customize.ts` 中：

    ```ts
    comments: {
        enabled: true,
        provider: 'twikoo',
        envId: 'https://comment.wakusei.top',
        pageview: true
    },
    ```

2. 在 `public/_headers` 的 CSP `connect-src` 里加上同一个地址：

    ```
    connect-src 'self' https://comment.wakusei.top;
    ```

    如果漏了这一步，`npm test` 会报错（`tests/post-comments.test.ts`）。

3. 部署站点后，打开任意文章，滚动到底部的评论区。点评论框右下角的小齿轮，**设置管理员密码**。之后所有配置都在这个管理面板里完成。

## 三、管理面板推荐配置

| 配置项 | 推荐值 | 作用 |
|---|---|---|
| `SITE_URL` | `https://www.wakusei.top` | 提醒消息里的跳转链接 |
| `CORS_ALLOW_ORIGIN` | `https://www.wakusei.top` | 只允许本站调用这个后端 |
| `BLOCKED_WORDS` | 最危险的词，用英文逗号分隔 | 命中后**直接拒绝提交** |
| `FORBIDDEN_WORDS` | 稍宽的一批敏感词 | 命中后标记为垃圾评论 |
| `HIDE_SPAM` | `true` | 垃圾评论对访客完全隐藏，只有你在后台能看到 |
| `LIMIT_PER_MINUTE` | `3` 左右 | 单个 IP 每分钟最多发几条 |
| `LIMIT_PER_MINUTE_ALL` | `10` 左右 | 全站每分钟最多几条，防止被刷屏 |
| `LLM_API_KEY` / `LLM_API_ENDPOINT` / `LLM_MODEL` | 见下文 | AI 判断垃圾评论和敏感内容 |
| `LLM_SPAM_PROMPT` | 见下文 | 让 AI 同时拦截政治敏感内容 |
| `PUSHOO_CHANNEL` / `PUSHOO_TOKEN` | 如 `telegram` | 新评论推送到 Telegram、Server 酱等 |
| `SMTP_SERVICE` / `SMTP_PASS` | `Resend` + API Key | 邮件提醒（Cloudflare 上**不能**用普通 SMTP，只能用 SendGrid、MailChannels 或 Resend） |
| `EMOTION_CDN` | 留空，或者按下面的 CSP 说明放行 | 默认会从第三方地址拉取表情包 |

### 关于敏感内容：词库不够，建议打开 AI 检测

Cloudflare 版**不支持** Akismet 和腾讯云内容安全。词库挡不住谐音、拆字、图片这些变体，只能作为第一道防线。

Twikoo 自带 AI 垃圾评论检测，接口兼容 OpenAI，在 Cloudflare 上也能用。可以接 DeepSeek，或者任何兼容 OpenAI 的服务（例如 Cloudflare Workers AI 的 OpenAI 兼容接口，这样就不用再注册别的平台）。在 `LLM_SPAM_PROMPT` 里写明“涉及政治、时事争议、违法内容的一律判为垃圾”，这类评论就会像违禁词一样被自动隐藏，等你事后复核。AI 也会误判，所以隔几天看一眼后台的“隐藏”列表。

### 人机验证（强烈建议）

允许匿名评论时，最有效的防刷手段是 Cloudflare Turnstile。在管理面板选择 Turnstile，并填入 `TURNSTILE_SITE_KEY` 和 `TURNSTILE_SECRET_KEY`。**同时**要在 `public/_headers` 的 CSP 里放行：

```
script-src ... https://challenges.cloudflare.com;
frame-src https://challenges.cloudflare.com;
```

## 四、站点侧的行为

- **三种语言共用一个评论区**：`/posts/x`、`/en/posts/x` 和 `/ja/posts/x` 的评论和浏览量是同一份（见 `commentThreadPath`，位于 `src/lib/comments.ts`）。
- **单篇关闭评论**：在 frontmatter 中写 `comments: false`，译文会自动沿用这个设置。浏览量照常统计。
- **按需加载**：评论区滚动到可见时才加载 Twikoo；浏览量在页面空闲时加载。两者共用同一个 JS 包，只下载一次。
- **本地预览不计数**：在 `localhost` 上打开页面时，不会把浏览量写进线上数据库。
- **日文界面**：Twikoo 的日文语言包是单独的文件。构建时会从 `node_modules` 复制到 `/twikoo/locales/ja-JP.js`（生成它的是 `src/pages/twikoo/locales/[name].js.ts`），升级 Twikoo 后自动跟着更新。
- **以后换评论系统**：`comments.provider` 就是为此预留的。目前只实现了 `twikoo`。
