import type { APIRoute } from 'astro';
import type { Locale } from '../../data/i18n';
import { siteConfig } from '../../data/site';
import { createAtomFeed } from '../../lib/feed';
import { NON_DEFAULT_LOCALES } from '../../lib/i18n-routing';
import { localizedSiteMeta } from '../../lib/i18n';
import { loadFeedDocuments } from '../../lib/posts';

export function getStaticPaths() {
    return NON_DEFAULT_LOCALES.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = async ({ params }) => {
    const locale = params.locale as Locale;
    const siteUrl = new URL(import.meta.env.SITE);
    const posts = await loadFeedDocuments(locale);
    const meta = localizedSiteMeta(locale);
    const body = createAtomFeed(
        {
            siteUrl,
            title: meta.title,
            description: meta.description,
            language: locale,
            authorName: siteConfig.profile.name,
            locale
        },
        posts
    );

    return new Response(body, {
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' }
    });
};
