import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const socialLinksComponent = readFileSync(join(process.cwd(), 'src', 'components', 'SocialLinks.vue'), 'utf8');

describe('SocialLinks component interactions', () => {
    it('uses pointer events to toggle the lifted state immediately', () => {
        expect(socialLinksComponent).toMatch(/@pointerenter=/);
        expect(socialLinksComponent).toMatch(/@pointerleave=/);
        expect(socialLinksComponent).toMatch(/@pointerdown=/);
        expect(socialLinksComponent).toMatch(/is-hovered/);
    });

    it('clears lifted state when navigating away and restoring from browser history', () => {
        expect(socialLinksComponent).toMatch(/clearAllHoveredStates/);
        expect(socialLinksComponent).toMatch(/clearHoveredStateOnNavigate/);
        expect(socialLinksComponent).toMatch(/handleLinkClick/);
        expect(socialLinksComponent).toMatch(/window\.addEventListener\('pagehide', clearAllHoveredStates\)/);
        expect(socialLinksComponent).toMatch(/window\.addEventListener\('pageshow', clearAllHoveredStates\)/);
    });

    it('maps vertical mouse wheel input to carousel page changes without blocking horizontal touchpads', () => {
        expect(socialLinksComponent).toMatch(/const wrapper = navRef\.value;/);
        expect(socialLinksComponent).toMatch(/function handleWheel/);
        expect(socialLinksComponent).toMatch(/Math\.abs\(e\.deltaX\) > Math\.abs\(e\.deltaY\)/);
        expect(socialLinksComponent).toMatch(/const direction = Math\.sign\(e\.deltaY\);/);
        expect(socialLinksComponent).toMatch(/let wheelLocked = false;/);
        expect(socialLinksComponent).toMatch(/function renewWheelLock/);
        expect(socialLinksComponent).toMatch(/if \(wheelLocked\)/);
        expect(socialLinksComponent).toMatch(/wheelLocked = true;/);
        expect(socialLinksComponent).toMatch(/wheelLocked = true;[\s\S]*?renewWheelLock\(\);/);
        expect(socialLinksComponent).toMatch(/wheelSettlingTimer = setTimeout/);
        expect(socialLinksComponent).toMatch(/e\.preventDefault\(\);/);
        expect(socialLinksComponent).toMatch(/showPage\(target\);/);
        expect(socialLinksComponent).toMatch(/wrapper\.addEventListener\('wheel', handleWheel, \{ passive: false \}\)/);
        expect(socialLinksComponent).toMatch(/clearTimeout\(wheelSettlingTimer\)/);
        expect(socialLinksComponent).toMatch(/wrapper\.removeEventListener\('wheel', handleWheel\)/);
    });

    it('uses the wrapper as the drag hot-zone for discrete pages', () => {
        expect(socialLinksComponent).toMatch(/const wrapper = navRef\.value;/);
        expect(socialLinksComponent).toMatch(/startX = e\.pageX - wrapper\.offsetLeft;/);
        expect(socialLinksComponent).toMatch(/const dragX = e\.pageX - wrapper\.offsetLeft;/);
        expect(socialLinksComponent).toMatch(/const dragDistance = dragX - startX;/);
        expect(socialLinksComponent).toMatch(/Math\.abs\(dragDistance\) < 36/);
        expect(socialLinksComponent).toMatch(/wrapper\.addEventListener\('pointerdown', handlePointerDown\)/);
        expect(socialLinksComponent).toMatch(/wrapper\.addEventListener\('pointermove', handlePointerMove\)/);
        expect(socialLinksComponent).toMatch(/wrapper\.addEventListener\('pointerup', handlePointerUp\)/);
        expect(socialLinksComponent).toMatch(/wrapper\.removeEventListener\('pointerdown', handlePointerDown\)/);
        expect(socialLinksComponent).not.toMatch(/scrollLeft/);
        expect(socialLinksComponent).not.toMatch(/addEventListener\('scroll'/);
    });

    it('renders only the current social page with stable color indexes', () => {
        expect(socialLinksComponent).toMatch(/currentLinks = computed\(\(\) => pages\.value\[currentPage\.value\] \?\? \[\]\)/);
        expect(socialLinksComponent).toMatch(/class="social-links-wrapper"/);
        expect(socialLinksComponent).toMatch(/id="socialLinksPage"/);
        expect(socialLinksComponent).toMatch(/ITEMS_PER_PAGE/);
        expect(socialLinksComponent).toMatch(/currentPage \* ITEMS_PER_PAGE \+ index/);
        expect(socialLinksComponent).toMatch(/social-link-slot--placeholder/);
        expect(socialLinksComponent).toMatch(/ITEMS_PER_PAGE - currentLinks\.length/);
    });

    it('drives fade swap animation when changing pages', () => {
        expect(socialLinksComponent).toMatch(/const transitionDirection = ref/);
        expect(socialLinksComponent).toMatch(/const animationKey = ref\(0\);/);
        expect(socialLinksComponent).toMatch(/function showPage/);
        expect(socialLinksComponent).toMatch(/transitionDirection\.value = target > currentPage\.value \? 'next' : 'prev';/);
        expect(socialLinksComponent).toMatch(/animationKey\.value \+= 1;/);
        expect(socialLinksComponent).toMatch(/:data-page-key="animationKey"/);
        expect(socialLinksComponent).toMatch(/animationKey % 2 === 1/);
        expect(socialLinksComponent).toMatch(/@animationend/);
        expect(socialLinksComponent).toMatch(/is-swap-fade/);
    });

    it('exposes current page state for pagination dots', () => {
        expect(socialLinksComponent).toMatch(/type="button"/);
        expect(socialLinksComponent).toMatch(/:aria-current="currentPage === i \? 'page' : undefined"/);
        expect(socialLinksComponent).toMatch(/aria-controls="socialLinksPage"/);
    });

    it('suppresses link activation after drag pagination', () => {
        expect(socialLinksComponent).toMatch(/let suppressNextClick = false;/);
        expect(socialLinksComponent).toMatch(/suppressNextClick = true;/);
        expect(socialLinksComponent).toMatch(/function handleLinkClick/);
        expect(socialLinksComponent).toMatch(/if \(suppressNextClick\)/);
        expect(socialLinksComponent).toMatch(/@click="\(event: MouseEvent\) => handleLinkClick/);
    });
});
