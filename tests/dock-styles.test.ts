import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dockCss = readFileSync(join(process.cwd(), 'src', 'styles', 'dock.css'), 'utf8');

describe('navigation dock styles', () => {
    it('uses a pill-style border-radius with glass border and shadow', () => {
        expect(dockCss).toMatch(/\.nav-dock\s*\{[\s\S]*border-radius:\s*24px;/);
        expect(dockCss).toMatch(/\.nav-dock\s*\{[\s\S]*border:\s*1px solid var\(--dock-border\);/);
        expect(dockCss).not.toMatch(/--dock-superellipse-n3/);
    });
});
