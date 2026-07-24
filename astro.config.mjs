import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
    site: 'https://www.wakusei.top',
    compressHTML: true,
    vite: {
        define: {
            __VUE_PROD_DEVTOOLS__: false
        }
    },
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
        processor: unified({
            gfm: true,
            smartypants: true,
            syntaxHighlight: 'shiki',
            shikiConfig: {
                themes: { light: 'github-light', dark: 'github-dark' },
                wrap: false
            },
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
        })
    }
});
