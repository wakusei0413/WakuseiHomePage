import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const footerComponent = readFileSync(join(process.cwd(), 'src', 'components', 'Footer.vue'), 'utf-8');

describe('Footer component behavior', () => {
    it('uses translated section headings', () => {
        expect(footerComponent).toMatch(/useI18n/);
        expect(footerComponent).toMatch(/t\('footer\.links'\)/);
        expect(footerComponent).toMatch(/t\('footer\.socials'\)/);
        expect(footerComponent).not.toMatch(/<h3 class="footer-section-title">Links<\/h3>/);
        expect(footerComponent).not.toMatch(/<h3 class="footer-section-title">Socials<\/h3>/);
    });

    it('opens only external footer links in a new tab', () => {
        expect(footerComponent).toMatch(/function isExternalLink/);
        expect(footerComponent).toMatch(/:target="isExternalLink\(link\.href\) \? '_blank' : undefined"/);
        expect(footerComponent).toMatch(/:rel="isExternalLink\(link\.href\) \? 'noopener noreferrer' : undefined"/);
        expect(footerComponent).not.toMatch(/<a :href="link\.href" target="_blank" rel="noopener noreferrer">/);
    });
});
