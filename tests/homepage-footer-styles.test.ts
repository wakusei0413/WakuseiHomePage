import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const componentsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'components.css'), 'utf8');
const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.svelte'), 'utf8');

describe('homepage footer visibility', () => {
    it('keeps the footer logic in the component while hiding it from layout', () => {
        assert.match(homepageApp, /<footer class="footer-left">/);
        assert.match(homepageApp, /siteConfig\.footer\.text/);
        assert.match(
            componentsCss,
            /\.footer-left\s*\{[^}]*display:\s*none;[^}]*\}/,
            'footer markup should remain available but not take vertical space in the left panel'
        );
    });
});
