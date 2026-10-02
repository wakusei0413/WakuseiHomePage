import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import { getBlogDateMetadata, parsePostUrl } from './src/lib/sitemap-helper';
import rehypeLinkCards from './src/lib/link-cards';

const astroVueClientEntry = fileURLToPath(new URL('./src/lib/astro-vue-client.ts', import.meta.url));
const vueRuntimeEntry = fileURLToPath(new URL('./node_modules/vue/dist/vue.runtime.esm-bundler.js', import.meta.url));
const vueRuntimePackages = ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared', 'pinia'];

function cloudflareRocketLoaderSafety() {
    return {
        name: 'cloudflare-rocket-loader-safety',
        hooks: {
            'astro:build:done': async ({ dir }) => {
                const outDir = dir instanceof URL ? fileURLToPath(dir) : String(dir);
                async function processDirectory(currentDir) {
                    let entries;
                    try {
                        entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
                    } catch {
                        return;
                    }
                    const tasks = entries.map(async (entry) => {
                        const fullPath = path.join(currentDir, entry.name);
                        if (entry.isDirectory()) {
                            await processDirectory(fullPath);
                        } else if (entry.isFile() && entry.name.endsWith('.html')) {
                            const content = await fs.promises.readFile(fullPath, 'utf8');
                            const patched = content.replace(
                                /<script(?![^>]*data-cfasync)/gi,
                                '<script data-cfasync="false"'
                            );
                            if (patched !== content) {
                                await fs.promises.writeFile(fullPath, patched, 'utf8');
                            }
                        }
                    });
                    await Promise.all(tasks);
                }
                await processDirectory(outDir);
            }
        }
    };
}

const I18N_DEFAULT_LOCALE = 'zh-CN';
const I18N_LOCALES = ['zh-CN', 'en', 'ja'];
const I18N_OPTIONS = { defaultLocale: I18N_DEFAULT_LOCALE, locales: I18N_LOCALES };

const { postDates, postLocales, latestSiteDate } = getBlogDateMetadata(I18N_OPTIONS);

export default defineConfig({
    site: 'https://www.wakusei.top',
    compressHTML: true,
    i18n: {
        defaultLocale: 'zh-CN',
        locales: ['zh-CN', 'en', 'ja'],
        routing: {
            prefixDefaultLocale: false
        }
    },
    vite: {
        define: {
            __VUE_PROD_DEVTOOLS__: false,
            // plugin-vue emits bare `__VUE_HMR_RUNTIME__` calls, but the pinned
            // bundler runtime does not install that global. Resolve it as a property
            // so a missing runtime is a no-op instead of a hydration ReferenceError.
            __VUE_HMR_RUNTIME__: 'globalThis.__VUE_HMR_RUNTIME__'
        },
        resolve: {
            alias: [
                { find: /^@astrojs\/vue\/client\.js$/, replacement: astroVueClientEntry },
                { find: /^vue$/, replacement: vueRuntimeEntry }
            ],
            dedupe: vueRuntimePackages
        },
        server: {
            // Vite marks dependency URLs as immutable even though their rewritten optimizer imports can change.
            headers: { 'Cache-Control': 'no-cache' }
        },
        // `astro sync` runs a temp Vite server with `optimizeDeps.noDiscovery`,
        // so CommonJS deps in the content-collection loader chain (picomatch,
        // p-limit, …) must be pre-bundled explicitly or they load as raw CJS
        // inside the ESM module runner and throw "require is not defined".
        optimizeDeps: {
            noDiscovery: true,
            include: [
                '@astrojs/vue/client.js',
                'vue',
                'pinia',
                'zod',
                'picomatch',
                'p-limit',
                'yocto-queue',
                'picocolors',
                'vue-virtual-scroller',
                // UMD bundle: served raw as ESM it only sets `window.twikoo` and exports nothing.
                'twikoo'
            ]
        }
    },
    integrations: [
        vue({
            appEntrypoint: '/src/pages/_app',
            devtools: false
        }),
        sitemap({
            i18n: {
                defaultLocale: 'zh-CN',
                locales: {
                    'zh-CN': 'zh-CN',
                    en: 'en',
                    ja: 'ja'
                }
            },
            filter: (page) => {
                if (page.includes('/404') || page.includes('/unsupported')) return false;

                // An article route whose locale has no translation serves the source
                // article verbatim and canonicalises back to it, so it must not be
                // submitted — nor cross-linked as a translation by the i18n option.
                const post = parsePostUrl(page, I18N_OPTIONS);
                if (!post) return true;
                const locales = postLocales.get(post.slug);
                return locales ? locales.has(post.locale) : true;
            },
            serialize(item) {
                const post = parsePostUrl(item.url, I18N_OPTIONS);
                if (post) {
                    const date =
                        postDates.get(`${post.slug}@${post.locale}`) ?? postDates.get(post.slug) ?? latestSiteDate;
                    if (date) {
                        item.lastmod = date;
                    }
                } else if (latestSiteDate) {
                    item.lastmod = latestSiteDate;
                }
                return item;
            }
        }),
        cloudflareRocketLoaderSafety()
    ],
    output: 'static',
    outDir: './dist',
    image: {
        layout: 'constrained',
        responsiveStyles: true
    },
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
                rehypeLinkCards,
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
