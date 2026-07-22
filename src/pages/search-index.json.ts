import type { APIRoute } from 'astro';
import { loadSearchIndex } from '../lib/posts';

export const GET: APIRoute = async () => {
    const entries = await loadSearchIndex();
    return new Response(JSON.stringify(entries), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate'
        }
    });
};
