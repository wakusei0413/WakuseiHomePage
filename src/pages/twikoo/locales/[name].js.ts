import type { APIRoute, GetStaticPaths } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { siteConfig } from '../../../data/site';
import { twikooLocaleChunk } from '../../../lib/comments';

/**
 * Twikoo loads non-built-in UI languages with `import(`${localeBaseUrl}/locales/<name>.js`)`.
 * The package's `exports` map hides those files from the bundler, so the build copies
 * the ones this site needs straight out of node_modules — they always match the
 * installed Twikoo version and nothing is vendored by hand.
 */

// `import.meta.url` points at the bundled server chunk during a static build, so
// anchor node_modules to the project root instead (same as og-default.jpg.ts).
const localesDir = path.resolve(process.cwd(), 'node_modules', 'twikoo', 'dist', 'locales');

export const getStaticPaths = (() => {
    if (!siteConfig.comments.enabled) return [];
    const chunks = new Set(
        siteConfig.i18n.locales.map(twikooLocaleChunk).filter((chunk): chunk is string => chunk !== null)
    );
    return [...chunks].map((name) => ({ params: { name } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
    const file = path.join(localesDir, `${params.name}.js`);
    return new Response(fs.readFileSync(file, 'utf8'), {
        headers: { 'Content-Type': 'text/javascript; charset=utf-8' }
    });
};
