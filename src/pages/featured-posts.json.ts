import type { APIRoute } from 'astro';
import { loadFeaturedPosts } from '../lib/posts';

export const GET: APIRoute = async () => {
    const featured = await loadFeaturedPosts(3);

    return new Response(JSON.stringify(featured), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate'
        }
    });
};
