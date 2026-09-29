import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { siteConfig } from './data/site';
import { buildPostEntryId } from './lib/post-locale';

// `index.md` is the source article; `index.<locale>.md` siblings are its
// translations. Both shapes are flattened into ids the locale resolver understands
// (`<slug>` and `<slug>@<locale>` — see `src/lib/post-locale.ts`).
const POST_FILE_PATTERN = /^(.*)\/index(?:\.([^./]+))?\.md$/i;

const blog = defineCollection({
    loader: glob({
        base: './src/content/blog',
        pattern: ['**/index.md', ...siteConfig.i18n.locales.map((locale) => `**/index.${locale}.md`)],
        generateId: ({ entry }) => {
            const normalized = entry.replace(/\\/g, '/');
            const match = POST_FILE_PATTERN.exec(normalized);
            if (!match) {
                return normalized.replace(/\.md$/i, '');
            }
            const [, slug, locale] = match;
            return buildPostEntryId(slug, locale ? (locale as (typeof siteConfig.i18n.locales)[number]) : null);
        }
    }),
    schema: ({ image }) =>
        z.object({
            title: z.string().min(1),
            description: z.string().min(1),
            cover: image().optional(),
            coverLayout: z.enum(['overlay', 'below']).optional(),
            language: z.enum(['zh-CN', 'en', 'ja']).optional(),
            category: z.string().min(1).optional(),
            tags: z.array(z.string().min(1)).optional(),
            author: z
                .object({
                    name: z.string().trim().min(1),
                    url: z.url().optional()
                })
                .optional(),
            // Present = reposted from elsewhere; absent = original. `true` marks a
            // repost whose source is unknown. Translations inherit it from index.md.
            repost: z
                .union([
                    z.literal(true),
                    z.object({
                        source: z.string().trim().min(1).optional(),
                        url: z.url().optional(),
                        author: z.string().trim().min(1).optional()
                    })
                ])
                .optional(),
            // `false` turns the comment section off for this post. Translations
            // inherit it from index.md.
            comments: z.boolean().optional(),
            draft: z.boolean().default(false),
            pubDate: z.coerce.date(),
            updatedDate: z.coerce.date().optional()
        })
});

export const collections = { blog };
