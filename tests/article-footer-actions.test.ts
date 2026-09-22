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
});
