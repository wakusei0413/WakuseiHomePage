import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { editableSiteConfig } from '../src/data/customize';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('UI/UX overhaul and accessibility enhancements', () => {
    const searchModalComponent = read('src/components/SearchModal.vue');
    const componentsCss = read('src/styles/components.css');
    const tocCss = read('src/styles/toc.css');
    const articleCss = read('src/styles/article.css');

    it('implements focus trap, keyboard arrow navigation, and search page link in SearchModal', () => {
        expect(searchModalComponent).toContain('previousActiveElement');
        expect(searchModalComponent).toContain("e.key === 'ArrowDown'");
        expect(searchModalComponent).toContain("e.key === 'ArrowUp'");
        expect(searchModalComponent).toContain("e.key === 'Enter'");
        expect(searchModalComponent).toContain("e.key === 'Tab'");
        expect(searchModalComponent).toContain('search-result--selected');
        expect(searchModalComponent).toContain('search-view-all-link');
        expect(searchModalComponent).toContain('handleViewAllSearch');
        expect(componentsCss).toContain('.search-modal-body .search-result--selected');
        expect(componentsCss).toContain('.search-modal-body .search-summary .search-view-all-link');
    });

    it('expands touch targets to >= 44px for TOC toggle, close button, and pagination dots', () => {
        expect(tocCss).toMatch(/\.article-toc__toggle::before\s*\{[\s\S]*?width:\s*44px;\s*height:\s*44px;/);
        expect(tocCss).toMatch(/\.article-toc__close::before\s*\{[\s\S]*?width:\s*44px;\s*height:\s*44px;/);
        expect(componentsCss).toMatch(/\.social-link-dot::before\s*\{[\s\S]*?width:\s*44px;\s*height:\s*44px;/);
    });

    it('enhances ticket and text contrast in light and dark modes', () => {
        expect(componentsCss).toMatch(/--ticket-muted:\s*rgba\(18,\s*18,\s*18,\s*0\.68\)/);
        expect(componentsCss).toMatch(/--ticket-muted:\s*rgba\(255,\s*254,\s*247,\s*0\.68\)/);
    });

    it('removes unused placeholder settings links from dock.items', () => {
        const hasPlaceholderSettings = editableSiteConfig.dock.items.some(
            (item) => item.type === 'link' && item.href === '#'
        );
        expect(hasPlaceholderSettings).toBe(false);
    });

    it('uses crisp 2D translateY for post cards to prevent 3D text blur', () => {
        expect(articleCss).toMatch(/\.post-card:hover\s*\{[\s\S]*?transform:\s*translateY\(-5px\);/);
    });

    it('ensures TOC panel has solid opaque background and direct active indicator', () => {
        expect(tocCss).toContain('--toc-panel-bg: var(--bg);');
        expect(tocCss).toContain('.article-toc__item--active');
        expect(tocCss).toContain('.article-toc__item--active::before');
    });
});
