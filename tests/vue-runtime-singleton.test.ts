// @vitest-environment node

import { realpathSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import astroConfig from '../astro.config.mjs';

const require = createRequire(import.meta.url);
const astroVueClient = readFileSync('src/lib/astro-vue-client.ts', 'utf8');
const upstreamAstroVueClient = readFileSync(require.resolve('@astrojs/vue/client.js'), 'utf8');
const astroVuePackage = JSON.parse(readFileSync(require.resolve('@astrojs/vue/package.json'), 'utf8')) as {
    version: string;
};
const siteShell = readFileSync('src/components/SiteShell.vue', 'utf8');
const expectedVuePackage = realpathSync(require.resolve('vue/package.json'));
const expectedVueRuntime = realpathSync(require.resolve('vue/dist/vue.runtime.esm-bundler.js'));
const expectedAstroVueClient = realpathSync('src/lib/astro-vue-client.ts');

function resolveVuePackageFrom(packageName: string) {
    const packageEntry = require.resolve(packageName);
    return realpathSync(createRequire(packageEntry).resolve('vue/package.json'));
}

describe('Vue runtime singleton guardrails', () => {
    it('resolves Vue consumers to the project Vue installation', () => {
        expect(resolveVuePackageFrom('@astrojs/vue')).toBe(expectedVuePackage);
        expect(resolveVuePackageFrom('@vitejs/plugin-vue')).toBe(expectedVuePackage);
        expect(resolveVuePackageFrom('pinia')).toBe(expectedVuePackage);
    });

    it('pins the Astro renderer and bare Vue imports to stable entries', () => {
        const aliases = astroConfig.vite?.resolve?.alias;
        expect(Array.isArray(aliases)).toBe(true);
        if (!Array.isArray(aliases)) throw new Error('Expected Vite aliases to use the array form');

        const astroClientAlias = aliases.find(
            (entry) =>
                entry.find instanceof RegExp &&
                entry.find.source === '^@astrojs\\/vue\\/client\\.js$' &&
                entry.find.flags === ''
        );
        const vueAlias = aliases.find(
            (entry) => entry.find instanceof RegExp && entry.find.source === '^vue$' && entry.find.flags === ''
        );

        expect(astroClientAlias).toBeDefined();
        expect(realpathSync(astroClientAlias?.replacement ?? '')).toBe(expectedAstroVueClient);
        expect(astroVueClient).toContain("from 'vue'");
        expect(astroVueClient).toContain("from 'virtual:astro:vue-app'");
        expect(vueAlias).toBeDefined();
        expect(realpathSync(vueAlias?.replacement ?? '')).toBe(expectedVueRuntime);
    });

    it('tracks the reviewed upstream renderer contract', () => {
        expect(astroVuePackage.version).toBe('7.0.3');

        const contractTokens = [
            'new WeakMap',
            'element.hasAttribute',
            'client !==',
            'createSSRApp',
            'createApp',
            'app.config.idPrefix',
            'await setup(app)',
            'app.mount(element, isHydrate)',
            "element.addEventListener('astro:unmount'",
            '$forceUpdate()'
        ];
        const normalize = (source: string) => source.replaceAll('"', "'").replace(/\s+/g, ' ');
        const local = normalize(astroVueClient);
        const upstream = normalize(upstreamAstroVueClient);

        for (const token of contractTokens) {
            expect(local, `local renderer is missing ${token}`).toContain(token);
            expect(upstream, `upstream renderer changed around ${token}`).toContain(token);
        }
    });

    it('dedupes Vue state packages and prebundles the Astro renderer with Vue', () => {
        expect(astroConfig.vite?.resolve?.dedupe).toEqual(
            expect.arrayContaining([
                'vue',
                '@vue/runtime-core',
                '@vue/runtime-dom',
                '@vue/reactivity',
                '@vue/shared',
                'pinia'
            ])
        );
        expect(astroConfig.vite?.optimizeDeps?.noDiscovery).toBe(true);
        expect(astroConfig.vite?.optimizeDeps?.include).toEqual(
            expect.arrayContaining(['@astrojs/vue/client.js', 'vue', 'pinia', 'zod'])
        );
        expect(astroConfig.vite?.server?.headers).toMatchObject({ 'Cache-Control': 'no-cache' });
    });

    it('keeps SiteShell DOM ownership scoped to template refs', () => {
        expect(siteShell).not.toContain("document.querySelector('.wallpaper-scroll-area')");
        expect(siteShell).not.toContain("document.querySelector('.container')");
    });
});
