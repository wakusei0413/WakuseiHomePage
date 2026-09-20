import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const articlePage = readFileSync(join(process.cwd(), 'src', 'pages', 'posts', '[...slug].astro'), 'utf8');
const articleStyles = readFileSync(join(process.cwd(), 'src', 'styles', 'article.css'), 'utf8');

describe('article footer actions', () => {
    it('renders the return routes as labelled navigation controls', () => {
        expect(articlePage).toContain('<nav class="post-footer__actions" aria-label="文章页导航">');
        expect(articlePage).toContain('class="back-link post-footer__action post-footer__action--primary"');
        expect(articlePage).toContain('<Icon name="arrow-left" size="0.9em" />');
        expect(articlePage).toContain('<Icon name="house" size="0.9em" />');
    });

    it('keeps the controls keyboard-visible and responsive', () => {
        expect(articleStyles).toContain('.post-container .post-footer__action:focus-visible');
        expect(articleStyles).toContain('@media (max-width: 480px)');
    });
});
