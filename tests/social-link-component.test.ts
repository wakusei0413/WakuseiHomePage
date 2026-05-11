import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const socialLinksComponent = readFileSync(join(process.cwd(), 'src', 'components', 'SocialLinks.svelte'), 'utf8');

describe('SocialLinks component interactions', () => {
    it('uses pointer events to toggle the lifted state immediately', () => {
        assert.match(socialLinksComponent, /onpointerenter=/);
        assert.match(socialLinksComponent, /onpointerleave=/);
        assert.match(socialLinksComponent, /onpointerdown=/);
        assert.match(socialLinksComponent, /class:is-hovered/);
    });

    it('clears lifted state when navigating away and restoring from browser history', () => {
        assert.match(socialLinksComponent, /clearAllHoveredStates/);
        assert.match(socialLinksComponent, /clearHoveredStateOnNavigate/);
        assert.match(socialLinksComponent, /handleLinkClick/);
        assert.match(socialLinksComponent, /window\.addEventListener\('pagehide', clearAllHoveredStates\)/);
        assert.match(socialLinksComponent, /window\.addEventListener\('pageshow', clearAllHoveredStates\)/);
    });

    it('maps vertical mouse wheel input to carousel page changes without blocking horizontal touchpads', () => {
        assert.match(socialLinksComponent, /const wrapper = navRef;/);
        assert.match(socialLinksComponent, /function handleWheel/);
        assert.match(socialLinksComponent, /Math\.abs\(e\.deltaX\) > Math\.abs\(e\.deltaY\)/);
        assert.match(socialLinksComponent, /const direction = Math\.sign\(e\.deltaY\);/);
        assert.match(socialLinksComponent, /let wheelLocked = false;/);
        assert.match(socialLinksComponent, /function renewWheelLock/);
        assert.match(socialLinksComponent, /if \(wheelLocked\)/);
        assert.match(socialLinksComponent, /wheelLocked = true;/);
        assert.match(socialLinksComponent, /wheelLocked = true;[\s\S]*?renewWheelLock\(\);/);
        assert.match(socialLinksComponent, /wheelSettlingTimer = setTimeout/);
        assert.match(socialLinksComponent, /e\.preventDefault\(\);/);
        assert.match(socialLinksComponent, /showPage\(target\);/);
        assert.match(socialLinksComponent, /wrapper\.addEventListener\('wheel', handleWheel, \{ passive: false \}\)/);
        assert.match(socialLinksComponent, /clearTimeout\(wheelSettlingTimer\)/);
        assert.match(socialLinksComponent, /wrapper\.removeEventListener\('wheel', handleWheel\)/);
    });

    it('uses the wrapper as the drag hot-zone for discrete pages', () => {
        assert.match(socialLinksComponent, /const wrapper = navRef;/);
        assert.match(socialLinksComponent, /startX = e\.pageX - wrapper\.offsetLeft;/);
        assert.match(socialLinksComponent, /const dragX = e\.pageX - wrapper\.offsetLeft;/);
        assert.match(socialLinksComponent, /const dragDistance = dragX - startX;/);
        assert.match(socialLinksComponent, /Math\.abs\(dragDistance\) < 36/);
        assert.match(socialLinksComponent, /wrapper\.addEventListener\('pointerdown', handlePointerDown\)/);
        assert.match(socialLinksComponent, /wrapper\.addEventListener\('pointermove', handlePointerMove\)/);
        assert.match(socialLinksComponent, /wrapper\.addEventListener\('pointerup', handlePointerUp\)/);
        assert.match(socialLinksComponent, /wrapper\.removeEventListener\('pointerdown', handlePointerDown\)/);
        assert.doesNotMatch(socialLinksComponent, /scrollLeft/);
        assert.doesNotMatch(socialLinksComponent, /addEventListener\('scroll'/);
    });

    it('renders only the current social page with stable color indexes', () => {
        assert.match(socialLinksComponent, /currentLinks = \$derived\(pages\[currentPage\] \?\? \[\]\)/);
        assert.match(socialLinksComponent, /class="social-links-wrapper"/);
        assert.match(socialLinksComponent, /id="socialLinksPage"/);
        assert.match(socialLinksComponent, /ITEMS_PER_PAGE/);
        assert.match(socialLinksComponent, /globalIdx = currentPage \* ITEMS_PER_PAGE \+ index/);
        assert.match(socialLinksComponent, /social-link-slot--placeholder/);
        assert.match(socialLinksComponent, /Array\.from\(\{ length: ITEMS_PER_PAGE - currentLinks\.length \}\)/);
    });

    it('drives fade swap animation when changing pages', () => {
        assert.match(socialLinksComponent, /let transitionDirection = \$state/);
        assert.match(socialLinksComponent, /let animationKey = \$state\(0\);/);
        assert.match(socialLinksComponent, /function showPage/);
        assert.match(socialLinksComponent, /transitionDirection = target > currentPage \? 'next' : 'prev';/);
        assert.match(socialLinksComponent, /animationKey \+= 1;/);
        assert.match(socialLinksComponent, /data-page-key=\{animationKey\}/);
        assert.match(socialLinksComponent, /animationKey % 2 === 1/);
        assert.match(socialLinksComponent, /onanimationend=\{\(\) => \(transitionDirection = null\)\}/);
        assert.match(socialLinksComponent, /is-swap-fade/);
    });

    it('exposes current page state for pagination dots', () => {
        assert.match(socialLinksComponent, /type="button"/);
        assert.match(socialLinksComponent, /aria-current=\{currentPage === i \? 'page' : undefined\}/);
        assert.match(socialLinksComponent, /aria-controls="socialLinksPage"/);
    });

    it('suppresses link activation after drag pagination', () => {
        assert.match(socialLinksComponent, /let suppressNextClick = false;/);
        assert.match(socialLinksComponent, /suppressNextClick = true;/);
        assert.match(socialLinksComponent, /function handleLinkClick/);
        assert.match(socialLinksComponent, /if \(suppressNextClick\)/);
        assert.match(socialLinksComponent, /onclick=\{\(event\) => handleLinkClick\(event, event\.currentTarget\)\}/);
    });
});
