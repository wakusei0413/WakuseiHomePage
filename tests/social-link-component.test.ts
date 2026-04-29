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
});
