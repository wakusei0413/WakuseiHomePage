import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
    site: 'https://www.wakusei.top',
    integrations: [
        vue({
            appEntrypoint: '/src/pages/_app',
            devtools: false
        }),
        sitemap({
            filter: (page) => !page.includes('/404')
        })
    ],
    output: 'static',
    outDir: './dist',
    devToolbar: {
        enabled: false
    },
    markdown: {
        syntaxHighlight: 'shiki',
        shikiConfig: {
            themes: { light: 'github-light', dark: 'github-dark' },
            wrap: false
        },
        gfm: true,
        smartypants: true,
        remarkPlugins: [],
        rehypePlugins: [
            rehypeSlug,
            [
                rehypeAutolinkHeadings,
                {
                    behavior: 'append',
                    properties: { className: ['anchor'], ariaHidden: 'true', tabIndex: -1 },
                    content: { type: 'text', value: '#' }
                }
            ]
        ]
    }
});
