import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'components.css'), 'utf8');
const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');

describe('homepage footer visibility', () => {
    it('keeps the footer logic in the layout while hiding it from component CSS', () => {
        expect(baseLayout).toMatch(/siteConfig\.footer\.text/);
        expect(componentsCss).not.toMatch(/\.footer-left\s*\{/);
    });
});
