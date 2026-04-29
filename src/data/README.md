# 配置速查

日常修改主页内容时，优先编辑：

- `src/data/customize.ts`

## 常用配置

- `profile`：头像、显示名称、状态文案
- `socialLinks`：社交按钮名称、链接、图标、颜色
- `slogans`：打字机文案、播放顺序、输入速度、停顿时间
- `time`：12/24 小时制、日期和星期显示
- `loading`：加载遮罩里的轮播文案
- `wallpaper`：壁纸 API、超时时间、重试次数、预加载数量、滚动参数
- `animation`：打字机光标样式
- `contentProtection`：复制和拖拽限制
- `effects`：滚动揭示等轻量页面效果

## 运行时文件

- `site.ts`：导出应用实际使用的校验后配置
- `schema.ts`：用 `Zod` 校验配置结构
- `customize.ts`：主要人工编辑入口

## 修改建议

- 改文案、链接、颜色、壁纸接口时，只改 `customize.ts`
- 改配置字段结构时，同时更新 `schema.ts` 和 `src/types/site.ts`
- 改页面表现或交互时，优先看 `src/components/` 和 `src/lib/`
- 改社交按钮弹起手感时，看 `src/components/SocialLinks.tsx` 和 `css/components.css`
