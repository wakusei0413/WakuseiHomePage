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
        expect(socialLinksComponent).toMatch(
            /currentLinks = computed\(\(\) => pages\.value\[currentPage\.value\] \?\? \[\]\)/
        );
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
        expect(socialLinksComponent).toMatch(
            /transitionDirection\.value = target > currentPage\.value \? 'next' : 'prev';/
        );
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

    it('always uses the paged grid layout and shows dots even for a single page', () => {
        expect(socialLinksComponent).toMatch(/class="social-links-wrapper"/);
        expect(socialLinksComponent).toMatch(/class="social-links-dots"/);
        expect(socialLinksComponent).not.toMatch(/v-if="totalPages > 1"/);
        expect(socialLinksComponent).not.toMatch(/props\.config\.links\.length <= ITEMS_PER_PAGE/);
        expect(socialLinksComponent).toMatch(
            /totalPages = computed\(\(\) => Math\.max\(1, Math\.ceil\(props\.config\.links\.length \/ ITEMS_PER_PAGE\)\)\)/
        );
    });

    it('suppresses link activation after drag pagination', () => {
        expect(socialLinksComponent).toMatch(/let suppressNextClick = false;/);
        expect(socialLinksComponent).toMatch(/suppressNextClick = true;/);
        expect(socialLinksComponent).toMatch(/function handleLinkClick/);
        expect(socialLinksComponent).toMatch(/if \(suppressNextClick\)/);
        expect(socialLinksComponent).toMatch(/@click="\s*\(event: MouseEvent\) =>\s*handleLinkClick/);
    });

    it('keeps carousel drag handlers from capturing pointer events on links', () => {
        expect(socialLinksComponent).toMatch(/function isInteractiveTarget/);
        expect(socialLinksComponent).toMatch(/if \(isInteractiveTarget\(e\.target\)\) return;/);
        expect(socialLinksComponent).toMatch(/Math\.abs\(dragX - startX\) < 6/);
        expect(socialLinksComponent).toMatch(/wrapper\.releasePointerCapture\(e\.pointerId\)/);
    });

    describe('copy links', () => {
        it('reuses the shared clipboard helper and the build-time site origin', () => {
            expect(socialLinksComponent).toContain("import { copyText } from '../lib/clipboard'");
            expect(socialLinksComponent).toContain("import { isCopyLink, resolveCopyUrl } from '../lib/social-link'");
            expect(socialLinksComponent).toMatch(/copyText\(resolveCopyUrl\(link\.url, resolveSiteOrigin\(\)\)\)/);
            expect(socialLinksComponent).toMatch(/import\.meta\.env\.SITE/);
        });

        it('resolves the origin lazily so SSR never touches window at module scope', () => {
            // resolveSiteOrigin 在函数体内读取，模块顶层求值会让构建期直接抛错。
            expect(socialLinksComponent).toMatch(/function resolveSiteOrigin\(\)/);
            expect(socialLinksComponent).not.toMatch(/^const \w+ = (?:window\.location|import\.meta\.env\.SITE)/m);
        });

        it('stays an anchor so a no-JS visitor can still open the raw feed', () => {
            // 复制行为是增强，不是替代：无 JS 时 /rss.xml 仍可访问。
            expect(socialLinksComponent).toMatch(/<a\s/);
            expect(socialLinksComponent).toMatch(/:href="link\.url"/);
        });

        it('lets modified clicks through to the real url', () => {
            expect(socialLinksComponent).toMatch(/function isModifiedClick/);
            expect(socialLinksComponent).toMatch(/event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey/);
            expect(socialLinksComponent).toMatch(/isCopyLink\(link\) && !isModifiedClick\(event\)/);
        });

        it('feeds the click handler the link so it can branch on copy', () => {
            expect(socialLinksComponent).toMatch(
                /handleLinkClick\(event, event\.currentTarget as HTMLAnchorElement, link\)/
            );
            expect(socialLinksComponent).toMatch(
                /function handleLinkClick\(event: MouseEvent, linkElement: HTMLAnchorElement, link: SocialLink\)/
            );
        });

        it('shows the copied state and its usage hint for a fixed window', () => {
            expect(socialLinksComponent).toMatch(/COPIED_DURATION/);
            expect(socialLinksComponent).toMatch(/copiedName/);
            expect(socialLinksComponent).toMatch(/social-link-toast/);
            expect(socialLinksComponent).toMatch(/social-link-toast__hint/);
            expect(socialLinksComponent).toMatch(/t\('social\.copy\.toast'\)/);
            expect(socialLinksComponent).toMatch(/t\('social\.copy\.hint'\)/);
            expect(socialLinksComponent).toMatch(/t\('social\.copy\.done'\)/);
            expect(socialLinksComponent).toMatch(/class="social-link-toast__icon"/);
            expect(socialLinksComponent).toMatch(/is-copied/);
        });

        it('clears hover and focus on copy so the card drops down immediately', () => {
            expect(socialLinksComponent).toMatch(
                /if \(isCopyLink\(link\) && !isModifiedClick\(event\)\) \{[\s\S]*?clearHoveredStateOnNavigate\(linkElement\);/
            );
        });

        it('exposes a persistent live region for the copy announcement', () => {
            // live region 必须在内容变化前就存在，用 v-if 插入不会被播报。
            expect(socialLinksComponent).toMatch(/role="status"/);
            expect(socialLinksComponent).toMatch(/aria-live="polite"/);
            expect(socialLinksComponent).toMatch(/liveMessage/);
        });

        it('clears the copied timer on teardown instead of leaving it dangling', () => {
            expect(socialLinksComponent).toMatch(/function resetCopiedState\(\)/);
            expect(socialLinksComponent).toMatch(/mountedCleanup = \(\) => \{[\s\S]*?resetCopiedState\(\);/);
            expect(socialLinksComponent).toMatch(/onUnmounted\(\(\) => \{[\s\S]*?resetCopiedState\(\);/);
        });
    });
});
