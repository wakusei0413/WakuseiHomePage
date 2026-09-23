import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

/**
 * Guards the image loading behaviour of the two surfaces that used to snap an
 * image into place with no reveal: post-card covers and the article lightbox.
 * The contract worth protecting is that a cover keeps its `src` in the SSR HTML
 * (so native lazy loading can prefetch it) and that both surfaces only reveal a
 * bitmap once it is decoded.
 */
describe('image loading reveal', () => {
    const postCard = read('src/components/PostCard.vue');
    const lightboxRuntime = read('src/scripts/image-lightbox.ts');
    const articleCss = read('src/styles/article.css');

    describe('post-card cover', () => {
        it('keeps the cover src in the markup instead of gating it behind an observer', () => {
            expect(postCard).toContain(':src="props.data.cover"');
            expect(postCard).not.toMatch(/:src="revealed/);
            // The reveal still drives the card's own entrance animation.
            expect(postCard).toContain("classList.add('scroll-reveal--visible')");
            expect(postCard).toContain('IntersectionObserver');
        });

        it('reveals the cover only after it has loaded and decoded', () => {
            expect(postCard).toContain('@load="handleCoverLoad"');
            expect(postCard).toContain('@error="showCover"');
            expect(postCard).toMatch(/cover\.decode\(\)\.then\(showCover, showCover\)/);
        });

        it('adopts a cover that finished loading before the island hydrated', () => {
            // Cards are client:idle, so a cached cover never fires `load` again —
            // without this branch the cover would stay transparent forever.
            expect(postCard).toMatch(/cover\?\.complete\s*&&\s*cover\.naturalWidth\s*>\s*0/);
        });

        it('fades the cover in, gated on scripting so a no-JS page still shows it', () => {
            expect(articleCss).toMatch(
                /@media \(scripting: enabled\) \{[\s\S]*?\.post-card \.post-cover--shown \{\s*opacity: 1;/
            );
            expect(articleCss).toMatch(
                /\.post-card \.post-cover \{\s*\n\s*transition:\s*\n\s*opacity 0\.45s var\(--curve-fade\),/
            );
        });

        it('restores an opacity transition on the card itself', () => {
            // .scroll-reveal declares the same transition shorthand at the same
            // specificity, and article.css loads after components.css — without
            // this the card entrance is a hard cut rather than a fade.
            expect(articleCss).toMatch(
                /\.post-card \{[\s\S]{0,600}?transition:\s*\n\s*opacity 0\.6s var\(--curve-snap\),/
            );
        });
    });

    describe('article lightbox', () => {
        it('warms and decodes the target before swapping it in', () => {
            expect(lightboxRuntime).toContain('function warmImage');
            expect(lightboxRuntime).toContain('async function swapImage');
            expect(lightboxRuntime).toMatch(/image\.decode\(\)/);
            expect(lightboxRuntime).toContain('warmNeighbours');
        });

        it('discards a superseded swap so fast arrow presses cannot interleave', () => {
            expect(lightboxRuntime).toContain('swapToken');
            expect(lightboxRuntime).toMatch(/token !== swapToken/);
        });

        it('clears warm-up bookkeeping on teardown', () => {
            expect(lightboxRuntime).toMatch(/swapToken \+= 1;[\s\S]*?warmed\.clear\(\);/);
            expect(lightboxRuntime).toContain('warmTimers.clear()');
            // The overlay outlives a navigation, so the previous article's bitmap
            // must not survive into the next one.
            expect(lightboxRuntime).toContain("overlayImg?.removeAttribute('src')");
        });

        it('fades between images instead of hard cutting', () => {
            expect(articleCss).toMatch(
                /\.article-lightbox__img \{[\s\S]*?transition: opacity 0\.12s var\(--curve-fade\);/
            );
            expect(articleCss).toMatch(/\.article-lightbox__img--swapping \{\s*opacity: 0;/);
        });

        it('drops the full-screen backdrop blur but keeps the overlay opaque', () => {
            // A viewport-sized backdrop-filter re-rasterizes every frame of the
            // open/close fade and again on every image swap. Under 0.9 alpha it
            // is invisible — the same cost the marquee already had removed.
            const overlayBlock = articleCss.match(/\.article-lightbox \{[\s\S]*?\n\}/)?.[0] ?? '';
            expect(overlayBlock).not.toBe('');
            expect(overlayBlock).not.toContain('backdrop-filter');
            expect(overlayBlock).toContain('rgba(0, 0, 0, 0.9)');
        });
    });
});
