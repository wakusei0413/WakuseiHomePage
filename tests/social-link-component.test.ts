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
        assert.match(socialLinksComponent, /clearHoveredStateOnNavigate\(linkElement\);/);
        assert.match(socialLinksComponent, /onClick=\{\(event\) => handleLinkClick\(event, event\.currentTarget\)\}/);
        assert.match(socialLinksComponent, /window\.addEventListener\('pagehide', clearAllHoveredStates\)/);
        assert.match(socialLinksComponent, /window\.addEventListener\('pageshow', clearAllHoveredStates\)/);
    });

    it('maps vertical mouse wheel input to carousel page changes without blocking horizontal touchpads', () => {
        assert.match(socialLinksComponent, /const wrapper = navRef;/);
        assert.match(socialLinksComponent, /const handleWheel = \(e: WheelEvent\) => \{/);
        assert.match(socialLinksComponent, /Math\.abs\(e\.deltaX\) > Math\.abs\(e\.deltaY\)/);
        assert.match(socialLinksComponent, /const direction = Math\.sign\(e\.deltaY\);/);
        assert.match(socialLinksComponent, /let wheelLocked = false;/);
        assert.match(socialLinksComponent, /const renewWheelLock = \(\) => \{/);
        assert.match(socialLinksComponent, /if \(wheelLocked\) \{/);
        assert.match(socialLinksComponent, /if \(wheelLocked\) \{[\s\S]*?renewWheelLock\(\);[\s\S]*?return;[\s\S]*?\}/);
        assert.match(socialLinksComponent, /wheelLocked = true;/);
        assert.match(socialLinksComponent, /wheelLocked = true;[\s\S]*?renewWheelLock\(\);/);
        assert.match(socialLinksComponent, /wheelSettlingTimer = window\.setTimeout/);
        assert.match(socialLinksComponent, /e\.preventDefault\(\);/);
        assert.match(socialLinksComponent, /showPage\(target\);/);
        assert.match(socialLinksComponent, /wrapper\.addEventListener\('wheel', handleWheel, \{ passive: false \}\)/);
        assert.match(socialLinksComponent, /window\.clearTimeout\(wheelSettlingTimer\);/);
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
        assert.match(socialLinksComponent, /const currentLinks = \(\) => pages\(\)\[currentPage\(\)\] \?\? \[\];/);
        assert.match(socialLinksComponent, /<nav[\s\S]*?class="social-links-wrapper"/);
        assert.match(socialLinksComponent, /id="socialLinksPage"/);
        assert.match(socialLinksComponent, /currentLinks\(\)\.map\(\(link, index\) =>/);
        assert.doesNotMatch(socialLinksComponent, /pages\(\)\.indexOf\(page\)/);
        assert.doesNotMatch(socialLinksComponent, /pages\(\)\.map\(\(page/);
        assert.match(socialLinksComponent, /const globalIdx = currentPage\(\) \* ITEMS_PER_PAGE \+ index;/);
        assert.match(socialLinksComponent, /social-link-slot social-link-slot--placeholder/);
        assert.match(socialLinksComponent, /Array\.from\(\{ length: ITEMS_PER_PAGE - currentLinks\(\)\.length \}\)/);
    });

    it('drives discrete slide animation when changing pages', () => {
        assert.match(socialLinksComponent, /const \[transitionDirection, setTransitionDirection\] = createSignal/);
        assert.match(socialLinksComponent, /const \[animationKey, setAnimationKey\] = createSignal\(0\);/);
        assert.match(socialLinksComponent, /const showPage = \(target: number\) => \{/);
        assert.match(socialLinksComponent, /setTransitionDirection\(target > currentPage\(\) \? 'next' : 'prev'\);/);
        assert.match(socialLinksComponent, /setAnimationKey\(\(value\) => value \+ 1\);/);
        assert.match(socialLinksComponent, /data-page-key=\{animationKey\(\)\}/);
        assert.match(socialLinksComponent, /'is-animation-alt': animationKey\(\) % 2 === 1/);
        assert.match(socialLinksComponent, /onAnimationEnd=\{\(\) => setTransitionDirection\(null\)\}/);
        assert.match(socialLinksComponent, /'is-slide-next': transitionDirection\(\) === 'next'/);
        assert.match(socialLinksComponent, /'is-slide-prev': transitionDirection\(\) === 'prev'/);
    });

    it('exposes current page state for pagination dots', () => {
        assert.match(socialLinksComponent, /type="button"/);
        assert.match(socialLinksComponent, /aria-current=\{currentPage\(\) === i \? 'page' : undefined\}/);
        assert.match(socialLinksComponent, /aria-controls="socialLinksPage"/);
    });

    it('suppresses link activation after drag pagination', () => {
        assert.match(socialLinksComponent, /let suppressNextClick = false;/);
        assert.match(socialLinksComponent, /suppressNextClick = true;/);
        assert.match(
            socialLinksComponent,
            /const handleLinkClick = \(event: MouseEvent, linkElement: HTMLAnchorElement\) => \{/
        );
        assert.match(
            socialLinksComponent,
            /if \(suppressNextClick\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?return;[\s\S]*?\}/
        );
        assert.match(socialLinksComponent, /onClick=\{\(event\) => handleLinkClick\(event, event\.currentTarget\)\}/);
    });
});
