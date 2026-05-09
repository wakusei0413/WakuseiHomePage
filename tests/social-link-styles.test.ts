import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const componentsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'components.css'), 'utf8');

describe('social link interaction styles', () => {
    it('keeps social link hover areas inside each card gap', () => {
        assert.doesNotMatch(
            componentsCss,
            /\.avatar-box::before,\s*\.social-link::before,\s*\.wallpaper-toggle::before,\s*\.close-panel::before/,
            'social link hover hot-zone should not bleed into neighboring card gaps'
        );
    });

    it('uses the glass-lens hover lift for custom social links', () => {
        assert.match(
            componentsCss,
            /\.social-link\s*\{[\s\S]*transition:\s*transform\s+0\.5s\s+var\(--curve-delicate\),[\s\S]*box-shadow\s+0\.8s\s+var\(--curve-delicate\),[\s\S]*background-color\s+0\.6s\s+ease,[\s\S]*border-color\s+0\.6s\s+ease;/
        );
        assert.match(
            componentsCss,
            /\.social-link-slot[\s\S]*?\.social-link--custom\s*\{[\s\S]*?transform:\s*translate3d\(-2px,\s*-2px,\s*0\);[\s\S]*?box-shadow:[\s\S]*?0 0 70px 10px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 12%, transparent\),[\s\S]*?0 0 36px 4px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 22%, transparent\),[\s\S]*?0 0 14px 2px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 38%, transparent\);/
        );
    });
});
