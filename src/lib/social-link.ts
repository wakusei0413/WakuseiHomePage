import type { SocialLink } from '../types/site';

/**
 * 社交卡片的两种行为：跳转（默认）与复制。RSS 这类地址在浏览器里打开只会看到
 * 原始 XML，对访客没有意义，所以它们走复制分支。
 */
export function isCopyLink(link: SocialLink): boolean {
    return link.copy === true;
}

/**
 * 把配置里的相对地址（如 `/rss.xml`）解析成可粘贴的绝对地址。
 *
 * 必须在点击时才调用，不能在模块顶层求值：`siteOrigin` 的兜底实现会读
 * `window`，顶层求值会让 SSR 直接抛错。
 */
export function resolveCopyUrl(url: string, siteOrigin: string): string {
    try {
        return new URL(url, siteOrigin).toString();
    } catch {
        // origin 不合法的极端情况下退回原始值，宁可复制一个相对地址也不要抛。
        return url;
    }
}
