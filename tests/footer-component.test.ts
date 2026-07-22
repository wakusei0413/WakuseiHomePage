import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const footerComponent = readFileSync(join(process.cwd(), 'src', 'components', 'Footer.vue'), 'utf-8');
const footerCss = readFileSync(join(process.cwd(), 'src', 'styles', 'footer.css'), 'utf-8');

describe('Footer component behavior', () => {
    it('renders only the compact copyright bar', () => {
        expect(footerComponent).toMatch(/copyrightText/);
        expect(footerComponent).toMatch(/footer-copyright/);
        expect(footerComponent).toMatch(/footer-tagline/);
        expect(footerComponent).not.toMatch(/footer-main/);
        expect(footerComponent).not.toMatch(/footer-links/);
        expect(footerComponent).not.toMatch(/footer-socials/);
        expect(footerComponent).not.toMatch(/useI18n/);
    });

    it('does not use full-viewport footer layout', () => {
        expect(footerCss).not.toMatch(/min-height:\s*100vh/);
        expect(footerCss).not.toMatch(/\.footer-main/);
        expect(footerCss).not.toMatch(/\.footer-social-icon/);
    });
});
