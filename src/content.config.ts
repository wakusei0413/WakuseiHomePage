import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
    loader: glob({
        base: './src/content/blog',
        pattern: '**/index.md',
        generateId: ({ entry }) =>
            entry
                .replace(/\\/g, '/')
                .replace(/\/index\.md$/i, '')
                .replace(/\.md$/i, '')
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
            draft: z.boolean().default(false),
            pubDate: z.coerce.date().optional(),
            updatedDate: z.coerce.date().optional()
        })
});

export const collections = { blog };
