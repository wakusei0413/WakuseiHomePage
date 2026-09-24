import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const articlePage = readFileSync(join(process.cwd(), 'src', 'pages', 'posts', '[...slug].astro'), 'utf8');
const footerNav = readFileSync(join(process.cwd(), 'src', 'components', 'PostFooterNav.vue'), 'utf8');
const articleStyles = readFileSync(join(process.cwd(), 'src', 'styles', 'article.css'), 'utf8');

describe('article footer actions', () => {
    it('renders the return routes as labelled navigation controls', () => {
        expect(footerNav).toContain('class="post-footer__actions"');
        expect(footerNav).toContain(':aria-label="t(\'article.footer.aria\')"');
        expect(footerNav).toContain('class="back-link post-footer__action post-footer__action--primary"');
        expect(footerNav).toContain('<Icon name="arrow-left" size="0.9em" />');
        expect(footerNav).toContain('<Icon name="house" size="0.9em" />');
    });

    it('mounts the footer actions from the article page', () => {
        expect(articlePage).toContain('<PostFooterNav client:idle prev={prev} next={next} />');
    });

    it('keeps the controls keyboard-visible and responsive', () => {
        expect(articleStyles).toContain('.post-container .post-footer__action:focus-visible');
        expect(articleStyles).toContain('@media (max-width: 480px)');
    });

    it('unifies footer action button styles and interaction effects with homepage pagination controls', () => {
        // Shared pill geometry, font, and smooth color transitions
        expect(articleStyles).toContain('min-width: 88px;');
        expect(articleStyles).toContain('border-radius: var(--radius-pill);');
        expect(articleStyles).toContain('font-family: var(--font-ui);');
        expect(articleStyles).toContain('color var(--transition-fast)');

        // Hover & active effects match homepage-pagination: border/bg/color all transition to accent blue
        expect(articleStyles).toContain('.post-container .post-footer__action:hover {');
        expect(articleStyles).toContain('color: var(--accent-blue);');
        expect(articleStyles).toContain('.post-container .post-footer__action:active {');
        expect(articleStyles).toContain('background: color-mix(in srgb, var(--accent-blue) 22%, var(--panel-glass));');

        // Dark theme background and border tokens aligned
        expect(articleStyles).toContain("[data-theme='dark'] .post-container .post-footer__action");
        expect(articleStyles).toContain('background: rgba(20, 20, 20, 0.78);');
    });
});
