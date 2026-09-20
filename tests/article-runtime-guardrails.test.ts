import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const imageLightboxRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'image-lightbox.ts'), 'utf8');
const readingProgressRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'reading-progress.ts'), 'utf8');
const articleRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'article-runtime.ts'), 'utf8');
const copyCodeRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'copy-code.ts'), 'utf8');
const copyHeadingRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'copy-heading-link.ts'), 'utf8');

describe('article runtime guardrails', () => {
    it('reattaches the cached lightbox overlay after Astro swaps replace the body', () => {
        expect(imageLightboxRuntime).toMatch(
            /if \(overlay\) \{[\s\S]*if \(!overlay\.isConnected\) document\.body\.appendChild\(overlay\);/
        );
    });

    it('keeps critical article behavior immediate and defers noncritical modules', () => {
        expect(articleRuntime).toContain("import './internal-nav';");
        expect(articleRuntime).toContain("import './reading-progress';");
        expect(articleRuntime).not.toMatch(/import '\.\/copy-code';/);
        expect(articleRuntime).not.toMatch(/import '\.\/copy-heading-link';/);
        expect(articleRuntime).not.toMatch(/import '\.\/image-lightbox';/);
        expect(articleRuntime).toContain("import('./copy-code')");
        expect(articleRuntime).toContain("import('./copy-heading-link')");
        expect(articleRuntime).toContain("import('./image-lightbox')");
    });

    it('owns one cancellable page-load scheduler with a stale-generation guard', () => {
        expect(articleRuntime.match(/astro:page-load/g)).toHaveLength(1);
        expect(articleRuntime).toContain("document.addEventListener('astro:before-swap', teardownArticleEnhancements)");
        expect(articleRuntime).toContain('requestIdleCallback(run, { timeout: IDLE_TIMEOUT })');
        expect(articleRuntime).toContain('window.setTimeout(run, IDLE_TIMEOUT)');
        expect(articleRuntime).toContain('scheduledGeneration !== generation || !root.isConnected');
    });

    it('keeps deferred modules free of page-load listeners and top-level enhancement calls', () => {
        for (const runtime of [copyCodeRuntime, copyHeadingRuntime, imageLightboxRuntime]) {
            expect(runtime).not.toContain('astro:page-load');
        }
        expect(copyCodeRuntime).toContain('export function enhanceCodeBlocks');
        expect(copyCodeRuntime).toContain('export function teardownCodeBlocks');
        expect(copyHeadingRuntime).toContain('export function enhanceHeadingLinks');
        expect(copyHeadingRuntime).toContain('export function teardownHeadingLinks');
        expect(imageLightboxRuntime).toContain('export function enhanceImageLightbox');
        expect(imageLightboxRuntime).toContain('export function teardownImageLightbox');
    });

    it('does not force full article layout while initializing progress at scroll top', () => {
        expect(readingProgressRuntime).toContain('if (scrollerEl.scrollTop > 0) scheduleProgress();');
        expect(readingProgressRuntime).not.toMatch(/addEventListener\('resize'[\s\S]*?applyProgress\(\);\n}/);
    });
});
