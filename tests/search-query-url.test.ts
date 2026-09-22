import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSearchUrlTemplate, readSearchQuery, writeSearchQuery } from '../src/lib/search-query';

const searchPage = readFileSync(join(process.cwd(), 'src', 'components', 'SearchPage.vue'), 'utf8');
const searchModal = readFileSync(join(process.cwd(), 'src', 'components', 'SearchModal.vue'), 'utf8');

describe('search query URL round-trip', () => {
    it('reads the query out of the search string', () => {
        expect(readSearchQuery('?q=%E5%AE%89%E5%8D%93')).toBe('安卓');
        expect(readSearchQuery('?q=astro+seo')).toBe('astro seo');
        expect(readSearchQuery('?category=Notes')).toBe('');
        expect(readSearchQuery('')).toBe('');
    });

    it('writes the trimmed query back and preserves unrelated state', () => {
        expect(writeSearchQuery('https://www.wakusei.top/search', '  安卓  ')).toBe('/search?q=%E5%AE%89%E5%8D%93');
        expect(writeSearchQuery('https://www.wakusei.top/search?q=old', 'astro')).toBe('/search?q=astro');
        expect(writeSearchQuery('https://www.wakusei.top/search?q=old&lang=en', 'astro')).toBe(
            '/search?q=astro&lang=en'
        );
    });

    it('drops the parameter when the query is cleared', () => {
        expect(writeSearchQuery('https://www.wakusei.top/search?q=astro', '')).toBe('/search');
        expect(writeSearchQuery('https://www.wakusei.top/search?q=astro', '   ')).toBe('/search');
        expect(writeSearchQuery('https://www.wakusei.top/search?q=astro&lang=en', '')).toBe('/search?lang=en');
    });

    it('always emits a path-relative target for replaceState', () => {
        expect(writeSearchQuery('https://www.wakusei.top/search', '')).not.toContain('http');
    });

    it('builds the SearchAction template the structured data advertises', () => {
        expect(createSearchUrlTemplate('https://www.wakusei.top/')).toBe(
            'https://www.wakusei.top/search?q={search_term_string}'
        );
    });
});

describe('search page wiring', () => {
    it('seeds the query from the URL and mirrors it back on change', () => {
        expect(searchPage).toContain("import { readSearchQuery, writeSearchQuery } from '../lib/search-query'");
        expect(searchPage).toContain('const requested = readSearchQuery(window.location.search)');
        expect(searchPage).toContain('window.history.replaceState(');
        expect(searchPage).not.toContain('window.history.pushState(');
    });

    it('agrees with the search modal, which already links to `?q=`', () => {
        expect(searchModal).toContain('/search?q=${encodeURIComponent(trimmedQuery.value)}');
    });
});
