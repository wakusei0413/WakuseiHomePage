import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const homepageComponent = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.vue'), 'utf8');

describe('HomepageApp pagination contract', () => {
    it('renders a labelled pagination nav only when multiple pages exist', () => {
        expect(homepageComponent).toContain('v-if="pagination.totalPages > 1"');
        expect(homepageComponent).toContain('class="homepage-pagination"');
        expect(homepageComponent).toContain(':aria-label="t(\'home.pagination.label\')"');
    });

    it('exposes current, previous and next page semantics', () => {
        expect(homepageComponent).toContain('aria-current="page"');
        expect(homepageComponent).toContain('aria-disabled="true"');
        expect(homepageComponent).toContain('rel="prev"');
        expect(homepageComponent).toContain('rel="next"');
        expect(homepageComponent).toContain(':href="pagination.previousHref"');
        expect(homepageComponent).toContain(':href="pagination.nextHref"');
    });

    it('renders every supplied numeric page link with an accessible label', () => {
        expect(homepageComponent).toContain('v-for="item in pagination.pages"');
        expect(homepageComponent).toContain(':href="item.href"');
        expect(homepageComponent).toContain(':aria-label="pageAriaLabel(item.page)"');
    });
});
