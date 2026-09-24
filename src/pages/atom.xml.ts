import type { APIRoute } from 'astro';
import { siteConfig } from '../data/site';
import { createAtomFeed } from '../lib/feed';
import { loadFeedDocuments } from '../lib/posts';

export const GET: APIRoute = async () => {
    const siteUrl = new URL(import.meta.env.SITE);
    const posts = await loadFeedDocuments();
    const body = createAtomFeed(
        {
            siteUrl,
            title: siteConfig.title,
            description: siteConfig.description,
            language: siteConfig.lang,
            authorName: siteConfig.profile.name
        },
        posts
    );

    return new Response(body, {
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' }
    });
};
