import { afterEach, describe, expect, it, vi } from 'vitest';
import { enhanceCodeBlocks, teardownCodeBlocks } from '../src/scripts/copy-code';
import { enhanceHeadingLinks, teardownHeadingLinks } from '../src/scripts/copy-heading-link';
import { enhanceImageLightbox, teardownImageLightbox } from '../src/scripts/image-lightbox';

function mockClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    return writeText;
}

afterEach(() => {
    teardownCodeBlocks();
    teardownHeadingLinks();
    teardownImageLightbox();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('deferred article enhancements', () => {
    it('decorates code blocks once and restores delegated copying after teardown', async () => {
        const writeText = mockClipboard();
        document.body.innerHTML =
            '<article class="post-body"><pre class="astro-code"><code>hello</code></pre></article>';
        const root = document.querySelector<HTMLElement>('.post-body')!;

        enhanceCodeBlocks(root);
        enhanceCodeBlocks(root);

        expect(root.querySelectorAll('.code-block')).toHaveLength(1);
        expect(root.querySelectorAll('.code-copy')).toHaveLength(1);
        root.querySelector<HTMLButtonElement>('.code-copy')!.click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));

        teardownCodeBlocks();
        enhanceCodeBlocks(root);
        root.querySelector<HTMLButtonElement>('.code-copy')!.click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    });

    it('decorates headings once and restores delegated deep-link copying after teardown', async () => {
        const writeText = mockClipboard();
        document.body.innerHTML = '<article class="post-body"><h2 id="intro">Intro</h2></article>';
        const root = document.querySelector<HTMLElement>('.post-body')!;

        enhanceHeadingLinks(root);
        enhanceHeadingLinks(root);

        expect(root.querySelectorAll('.heading-copy')).toHaveLength(1);
        root.querySelector<HTMLButtonElement>('.heading-copy')!.click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#intro$/)));

        teardownHeadingLinks();
        enhanceHeadingLinks(root);
        root.querySelector<HTMLButtonElement>('.heading-copy')!.click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    });

    it('reuses one lightbox across body swaps and restores Escape handling after teardown', () => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            callback(0);
            return 1;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
        document.body.innerHTML =
            '<article class="post-body"><img src="/one.jpg" alt="One"><a href="/"><img src="/linked.jpg"></a></article>';
        const firstRoot = document.querySelector<HTMLElement>('.post-body')!;

        enhanceImageLightbox(firstRoot);
        enhanceImageLightbox(firstRoot);
        const firstImage = firstRoot.querySelector<HTMLImageElement>('img')!;
        expect(firstImage.classList.contains('lightbox-eligible')).toBe(true);
        expect(firstRoot.querySelector<HTMLImageElement>('a img')!.classList.contains('lightbox-eligible')).toBe(false);

        firstImage.click();
        expect(document.querySelectorAll('.article-lightbox')).toHaveLength(1);
        expect(document.querySelector<HTMLElement>('.article-lightbox')!.style.display).toBe('flex');
        expect(document.body.style.overflow).toBe('hidden');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(document.body.style.overflow).toBe('');

        teardownImageLightbox();
        document.body.innerHTML = '<article class="post-body"><img src="/two.jpg" alt="Two"></article>';
        const nextRoot = document.querySelector<HTMLElement>('.post-body')!;
        enhanceImageLightbox(nextRoot);
        nextRoot.querySelector<HTMLImageElement>('img')!.click();

        expect(document.querySelectorAll('.article-lightbox')).toHaveLength(1);
        expect(document.querySelector<HTMLImageElement>('.article-lightbox__img')!.alt).toBe('Two');
    });
});
