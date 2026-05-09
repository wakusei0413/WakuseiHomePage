import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const dockCss = readFileSync(join(process.cwd(), 'src', 'styles', 'dock.css'), 'utf8');

describe('navigation dock styles', () => {
    it('uses a pill-style border-radius with glass border and shadow', () => {
        assert.match(dockCss, /\.nav-dock\s*\{[\s\S]*border-radius:\s*32px;/);
        assert.match(dockCss, /\.nav-dock\s*\{[\s\S]*border:\s*1px solid var\(--dock-border\);/);
        assert.doesNotMatch(dockCss, /--dock-superellipse-n3/);
    });
});
