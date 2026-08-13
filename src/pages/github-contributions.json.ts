import type { APIRoute } from 'astro';
import { siteConfig } from '../data/site';
import { fetchContributionsFromApi } from '../lib/github-contributions';

/**
 * 构建时生成 GitHub 贡献数据快照（与 search-index.json.ts 同款端点路由模式）：
 * astro build 时执行一次抓取，输出为静态 /github-contributions.json，
 * 客户端只读站内文件，不再直连第三方 API。
 *
 * 容错：外部 API 失败/超时输出空数据（页面降级为 GitHub 链接），不得阻断构建。
 */
export const GET: APIRoute = async () => {
    let payload: unknown;
    try {
        payload = await fetchContributionsFromApi(siteConfig.github.username);
    } catch {
        payload = { total: {}, contributions: [] };
    }
    return new Response(JSON.stringify(payload), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate'
        }
    });
};
