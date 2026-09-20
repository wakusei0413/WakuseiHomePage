import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const astroVueClientEntry = fileURLToPath(new URL('./src/lib/astro-vue-client.ts', import.meta.url));
const vueRuntimeEntry = fileURLToPath(new URL('./node_modules/vue/dist/vue.runtime.esm-bundler.js', import.meta.url));
const vueRuntimePackages = ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared', 'pinia'];

function cloudflareRocketLoaderSafety() {
    return {
        name: 'cloudflare-rocket-loader-safety',
        hooks: {
            'astro:build:done': async ({ dir }) => {
                const outDir = dir instanceof URL ? fileURLToPath(dir) : String(dir);
                function patchHtmlFiles(currentDir) {
                    if (!fs.existsSync(currentDir)) return;
                    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(currentDir, entry.name);
                        if (entry.isDirectory()) {
                            patchHtmlFiles(fullPath);
                        } else if (entry.isFile() && entry.name.endsWith('.html')) {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            const patched = content.replace(
                                /<script(?![^>]*data-cfasync)/gi,
                                '<script data-cfasync="false"'
                            );
                            if (patched !== content) {
                                fs.writeFileSync(fullPath, patched, 'utf8');
                            }
                        }
                    }
                }
                patchHtmlFiles(outDir);
            }
        }
    };
}

export default defineConfig({
    site: 'https://www.wakusei.top',
    compressHTML: true,
    vite: {
        define: {
            __VUE_PROD_DEVTOOLS__: false
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
                'picocolors'
            ]
        }
    },
    integrations: [
        vue({
            appEntrypoint: '/src/pages/_app',
            devtools: false
        }),
        sitemap({
            filter: (page) => !page.includes('/404')
        }),
        cloudflareRocketLoaderSafety()
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
