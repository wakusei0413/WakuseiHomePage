import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const backToTopRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'back-to-top.ts'), 'utf8');
const imageLightboxRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'image-lightbox.ts'), 'utf8');

describe('article runtime guardrails', () => {
    it('cleans up the back-to-top click listener before rebinding after Astro page loads', () => {
        expect(backToTopRuntime).toMatch(/let clickHandler: \(\(\) => void\) \| null = null;/);
        expect(backToTopRuntime).toMatch(
            /if \(clickHandler && btn\) btn\.removeEventListener\('click', clickHandler\);/
        );
        expect(backToTopRuntime).toMatch(
            /clickHandler = \(\) => scrollerEl\?\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\);/
        );
        expect(backToTopRuntime).toMatch(/btn\.addEventListener\('click', clickHandler\);/);
    });

    it('reattaches the cached lightbox overlay after Astro swaps replace the body', () => {
        expect(imageLightboxRuntime).toMatch(
            /if \(overlay\) \{[\s\S]*if \(!overlay\.isConnected\) document\.body\.appendChild\(overlay\);/
        );
    });

    it('closes the lightbox before rescanning article images on page loads', () => {
        const enhanceStart = imageLightboxRuntime.indexOf('function enhance()');
        const enhanceBlock = imageLightboxRuntime.slice(enhanceStart, imageLightboxRuntime.indexOf('}', enhanceStart));

        expect(enhanceStart).toBeGreaterThanOrEqual(0);
        expect(enhanceBlock).toContain('close();');
        expect(imageLightboxRuntime).toContain("document.addEventListener('astro:page-load', enhance)");
    });
});
