import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runtimeEffects = readFileSync(join(process.cwd(), 'src', 'lib', 'runtime-effects.ts'), 'utf-8');
const topBarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf-8');
const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');

describe('logic guardrails', () => {
    it('does not block copy and cut inside editable controls', () => {
        expect(runtimeEffects).toMatch(/const isEditableTarget = \(target: EventTarget \| null\) =>/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('copy',/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('cut',/);
        expect(runtimeEffects).toMatch(/if \(isEditableTarget\(event\.target\)\) return;/);
    });

    it('cleans up topbar magnify listeners and rebinds on viewport changes', () => {
        expect(topBarComponent).toMatch(/let magnifyCleanup: \(\(\) => void\) \| undefined;/);
        expect(topBarComponent).toMatch(/watch\(\[isMobile, barRef\]/);
        expect(topBarComponent).toMatch(/if \(magnifyCleanup\) \{/);
        expect(topBarComponent).toMatch(/magnifyCleanup = setupIconMagnifyHover\(\);/);
    });

    it('does not use the global page scroller as homepage readiness detection', () => {
        const loaderStart = baseLayout.indexOf("var storageKey = '__wakusei_skip_entry_loader';");
        const loaderEnd = baseLayout.indexOf('</script>', loaderStart);
        const loaderBlock = baseLayout.slice(loaderStart, loaderEnd);

        expect(loaderBlock).not.toContain("document.querySelector('.page-scroller')");
        expect(baseLayout).toContain("document.documentElement.classList.contains('is-home')");
        expect(baseLayout).toContain("document.body.classList.contains('is-home')");
    });

    it('dispatches shell state before Astro swaps persisted islands', () => {
        const beforeSwapStart = baseLayout.indexOf("document.addEventListener('astro:before-swap'");
        const afterSwapStart = baseLayout.indexOf("document.addEventListener('astro:after-swap'", beforeSwapStart);
        const beforeSwapBlock = baseLayout.slice(beforeSwapStart, afterSwapStart);

        expect(beforeSwapStart).toBeGreaterThanOrEqual(0);
        expect(beforeSwapBlock).toContain('event.newDocument');
        expect(beforeSwapBlock).toContain('getShellStateFromDocument(event.newDocument)');
        expect(beforeSwapBlock).toContain('dispatchShellState');
        expect(baseLayout).toContain('pageTransitionSurface');
        expect(baseLayout).toContain('wakusei:shell-page-change');
    });

    it('resets the shared page scroller after Astro swaps content', () => {
        const afterSwapStart = baseLayout.indexOf("document.addEventListener('astro:after-swap'");
        const afterSwapBlock = baseLayout.slice(afterSwapStart);

        expect(afterSwapStart).toBeGreaterThanOrEqual(0);
        expect(afterSwapBlock).toContain("document.getElementById('pageScroller')");
        expect(afterSwapBlock).toContain('scrollTo({ top: 0 })');
    });
});
