import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const internalNav = readFileSync(join(process.cwd(), 'src', 'scripts', 'internal-nav.ts'), 'utf8');
const topBar = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf8');

describe('navigation click guardrails', () => {
    it('preserves modified clicks and non-primary clicks on enhanced internal links', () => {
        expect(internalNav).toContain('event.button === 0');
        expect(internalNav).toContain('!event.metaKey');
        expect(internalNav).toContain('!event.ctrlKey');
        expect(internalNav).toContain('!event.shiftKey');
        expect(internalNav).toContain('!event.altKey');
        expect(internalNav).toContain("(!anchor.target || anchor.target === '_self')");
        expect(internalNav).toContain("!anchor.hasAttribute('download')");
        expect(internalNav).toMatch(/if \(!shouldHandleNavigationClick\(e, a\)\) return;/);
    });

    it('does not hijack protocol-relative, mail, or telephone links', () => {
        expect(internalNav).toMatch(/\(\?:mailto\|tel\)/);
        expect(internalNav).toContain('[a-z\\d+.-]*:');
        expect(internalNav).toMatch(/\/\//);
    });

    it('preserves modified clicks on top-bar links', () => {
        expect(topBar).toContain('event.button === 0');
        expect(topBar).toContain('!event.metaKey');
        expect(topBar).toContain('!event.ctrlKey');
        expect(topBar).toContain('!event.shiftKey');
        expect(topBar).toContain('!event.altKey');
        expect(topBar).toMatch(/if \(!shouldHandleNavigationClick\(e\)\) return;/);
    });
});
