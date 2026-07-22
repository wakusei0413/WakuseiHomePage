import type { APIRoute } from 'astro';
import { siteConfig } from '../data/site';
import { createRssFeed } from '../lib/feed';
import { loadPublishedPostEntries } from '../lib/posts';

export const GET: APIRoute = async () => {
    const siteUrl = new URL(import.meta.env.SITE);
    const posts = await loadPublishedPostEntries();
    const body = createRssFeed(
        {
            siteUrl,
            title: siteConfig.title,
            description: siteConfig.description,
            language: siteConfig.lang,
            authorName: siteConfig.profile.name
        },
        posts.map(({ slug, data }) => ({ slug, data }))
    );

    return new Response(body, {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }
    });
};
