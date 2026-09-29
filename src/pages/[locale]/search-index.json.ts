import type { APIRoute } from 'astro';
import type { Locale } from '../../data/i18n';
import { NON_DEFAULT_LOCALES } from '../../lib/i18n-routing';
import { loadSearchIndex } from '../../lib/posts';

export function getStaticPaths() {
    return NON_DEFAULT_LOCALES.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = async ({ params }) => {
    const entries = await loadSearchIndex(params.locale as Locale);
    return new Response(JSON.stringify(entries), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate'
        }
    });
};
