import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runtimeEffects = readFileSync(join(process.cwd(), 'src', 'lib', 'runtime-effects.ts'), 'utf-8');
const topBarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf-8');
const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const navigationRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'navigation-runtime.ts'), 'utf8');

describe('logic guardrails', () => {
    it('does not block copy and cut inside editable controls', () => {
        expect(runtimeEffects).toMatch(/const isEditableTarget = \(target: EventTarget \| null\) =>/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('copy',/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('cut',/);
        expect(runtimeEffects).toMatch(/if \(isEditableTarget\(event\.target\)\) return;/);
    });

    it('does not block mousedown on descendants inside links and buttons', () => {
        expect(runtimeEffects).toMatch(/const isInteractiveTarget = \(target: EventTarget \| null\) =>/);
        expect(runtimeEffects).toMatch(/element\.closest\('a, button, \[role="button"\], label'\)/);
        expect(runtimeEffects).toMatch(/if \(isInteractiveTarget\(event\.target\)\) return;/);
    });

    it('cleans up topbar magnify listeners and rebinds on viewport changes', () => {
        expect(topBarComponent).toMatch(/let magnifyCleanup: \(\(\) => void\) \| undefined;/);
        expect(topBarComponent).toMatch(/watch\(\[isMobile, barRef\]/);
        expect(topBarComponent).toMatch(/if \(magnifyCleanup\) \{/);
        expect(topBarComponent).toMatch(/magnifyCleanup = setupIconMagnifyHover\(\);/);
    });

    it('does not use the global page scroller as homepage readiness detection', () => {
        const readyStart = navigationRuntime.indexOf('function isIncomingHomeReady()');
        const readyEnd = navigationRuntime.indexOf('}', readyStart);
        const readyBlock = navigationRuntime.slice(readyStart, readyEnd);

        expect(readyBlock).not.toContain("document.querySelector('.page-scroller')");
        expect(readyBlock).toContain("document.querySelector('.container.visible')");
    });

    it('dispatches shell state before Astro swaps persisted islands', () => {
        const beforeSwapStart = navigationRuntime.indexOf("document.addEventListener('astro:before-swap'");
        const afterSwapStart = navigationRuntime.indexOf(
            "document.addEventListener('astro:after-swap'",
            beforeSwapStart
        );
        const beforeSwapBlock = navigationRuntime.slice(beforeSwapStart, afterSwapStart);

        expect(beforeSwapStart).toBeGreaterThanOrEqual(0);
        expect(beforeSwapBlock).toContain('swapEvent.newDocument');
        expect(beforeSwapBlock).toContain('getPageShellStateFromDocument(swapEvent.newDocument)');
        expect(beforeSwapBlock).toContain('dispatchPageShellStateChange');
        expect(baseLayout).toContain('pageTransitionSurface');
        expect(navigationRuntime).toContain("from '../lib/page-shell-context'");
        expect(navigationRuntime).not.toContain('function getShellStateFromDocument');
        expect(navigationRuntime).not.toContain('function dispatchShellState');
    });

    it('resets the shared page scroller after Astro swaps content', () => {
        const afterSwapStart = navigationRuntime.indexOf("document.addEventListener('astro:after-swap'");
        const afterSwapBlock = navigationRuntime.slice(afterSwapStart);

        expect(afterSwapStart).toBeGreaterThanOrEqual(0);
        expect(afterSwapBlock).toContain("document.getElementById('pageScroller')");
        expect(afterSwapBlock).toContain('scrollTo({ top: 0 })');
    });
});
