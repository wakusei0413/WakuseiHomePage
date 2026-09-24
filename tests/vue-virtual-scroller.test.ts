// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import astroConfig from '../astro.config.mjs';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('vue-virtual-scroller integration', () => {
    const packageJson = JSON.parse(read('package.json')) as { dependencies?: Record<string, string> };
    const appTs = read('src/pages/_app.ts');
    const baseLayout = read('src/layouts/BaseLayout.astro');
    const searchModal = read('src/components/SearchModal.vue');
    const componentsCss = read('src/styles/components.css');
    const typesDts = read('src/types/vue-virtual-scroller.d.ts');

    it('declares vue-virtual-scroller dependency', () => {
        expect(packageJson.dependencies?.['vue-virtual-scroller']).toBeDefined();
    });

    it('prebundles vue-virtual-scroller in Vite configuration', () => {
        expect(astroConfig.vite?.optimizeDeps?.include).toContain('vue-virtual-scroller');
    });

    it('registers VueVirtualScroller in _app.ts', () => {
        expect(appTs).toContain("import VueVirtualScroller from 'vue-virtual-scroller'");
        expect(appTs).toContain('app.use(VueVirtualScroller)');
    });

    it('imports vue-virtual-scroller.css in BaseLayout.astro', () => {
        expect(baseLayout).toContain("import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'");
    });

    it('augments Vue global components for TypeScript in vue-virtual-scroller.d.ts', () => {
        expect(typesDts).toContain("declare module '@vue/runtime-core'");
        expect(typesDts).toContain('RecycleScroller: typeof RecycleScroller');
        expect(typesDts).toContain('DynamicScroller: typeof DynamicScroller');
        expect(typesDts).toContain('DynamicScrollerItem: typeof DynamicScrollerItem');
    });

    it('integrates DynamicScroller into SearchModal.vue with keyboard navigation support', () => {
        expect(searchModal).toContain("import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'");
        expect(searchModal).toContain('<DynamicScroller');
        expect(searchModal).toContain('<DynamicScrollerItem');
        expect(searchModal).toContain('scrollerRef.value?.scrollToItem(selectedIndex.value)');
        expect(searchModal).toContain('key-field="slug"');
        expect(searchModal).toContain(':min-item-size="120"');
    });

    it('configures styles for virtual scroller container and items in components.css', () => {
        expect(componentsCss).toContain('.search-modal-body .search-results');
        expect(componentsCss).toContain('.search-modal-body .search-result-item');
        expect(componentsCss).toContain('padding-bottom: 16px');
    });
});
