import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'components.css'), 'utf8');
const pageFrame = readFileSync(join(process.cwd(), 'src', 'components', 'PageFrame.vue'), 'utf8');

describe('homepage footer visibility', () => {
    it('keeps the footer logic in the component while hiding it from layout', () => {
        expect(pageFrame).toMatch(/<footer class="footer-left">/);
        expect(pageFrame).toMatch(/siteConfig\.footer\.text/);
        expect(componentsCss).toMatch(/\.footer-left\s*\{[^}]*display:\s*none;[^}]*\}/);
    });
});
