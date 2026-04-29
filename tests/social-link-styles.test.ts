import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const componentsCss = readFileSync(join(process.cwd(), 'css', 'components.css'), 'utf8');

describe('social link interaction styles', () => {
    it('keeps social link hover areas inside each card gap', () => {
        assert.doesNotMatch(
            componentsCss,
            /\.avatar-box::before,\s*\.social-link::before,\s*\.wallpaper-toggle::before,\s*\.close-panel::before/,
            'social link hover hot-zone should not bleed into neighboring card gaps'
        );
    });

    it('uses a near-instant vertical lift for social link hover', () => {
        assert.match(componentsCss, /\.social-link\s*\{[\s\S]*transition:\s*none;/);
        assert.match(
            componentsCss,
            /\.social-link-slot:hover\s+\.social-link--custom,\s*\.social-link-slot:focus-within\s+\.social-link--custom\s*\{[\s\S]*transform:\s*translate3d\(0,\s*-6px,\s*0\);[\s\S]*box-shadow:\s*6px 10px 0 var\(--custom-color,\s*#ffe600\);/
        );
    });
});
