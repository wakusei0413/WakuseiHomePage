import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const socialLinksComponent = readFileSync(join(process.cwd(), 'src', 'components', 'SocialLinks.tsx'), 'utf8');

describe('SocialLinks component interactions', () => {
    it('uses pointer events to toggle the lifted state immediately', () => {
        assert.match(socialLinksComponent, /onPointerEnter=/);
        assert.match(socialLinksComponent, /onPointerLeave=/);
        assert.match(socialLinksComponent, /onPointerDown=/);
        assert.match(socialLinksComponent, /classList=\{\{ 'is-hovered':/);
    });

    it('clears lifted state when navigating away and restoring from browser history', () => {
        assert.match(socialLinksComponent, /clearAllHoveredStates/);
        assert.match(
            socialLinksComponent,
            /onClick=\{\(event\) => clearHoveredStateOnNavigate\(event\.currentTarget\)\}/
        );
        assert.match(socialLinksComponent, /window\.addEventListener\('pagehide', clearAllHoveredStates\)/);
        assert.match(socialLinksComponent, /window\.addEventListener\('pageshow', clearAllHoveredStates\)/);
    });
});
