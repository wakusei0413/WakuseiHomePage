import { createSignal, onCleanup, onMount } from 'solid-js';
import type { SocialLink, SocialLinksConfig } from '../types/site';
import { Icon } from './Icon';

const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];
const ITEMS_PER_PAGE = 6;

export function SocialLinks(props: { config: SocialLinksConfig }) {
    const [breathe, setBreathe] = createSignal(true);
    const [currentPage, setCurrentPage] = createSignal(0);
    const [transitionDirection, setTransitionDirection] = createSignal<'next' | 'prev' | null>(null);
    const [animationKey, setAnimationKey] = createSignal(0);
    let navRef: HTMLElement | undefined;
    let suppressNextClick = false;
    let suppressClickTimer: number | undefined;

    const totalPages = () => Math.ceil(props.config.links.length / ITEMS_PER_PAGE);
    const pages = (): SocialLink[][] => {
        const result: SocialLink[][] = [];
        for (let i = 0; i < props.config.links.length; i += ITEMS_PER_PAGE) {
            result.push(props.config.links.slice(i, i + ITEMS_PER_PAGE));
        }
        return result;
    };
    const currentLinks = () => pages()[currentPage()] ?? [];

    const showPage = (target: number) => {
        const clamped = Math.max(0, Math.min(target, totalPages() - 1));
        if (clamped === currentPage()) return;

        setTransitionDirection(target > currentPage() ? 'next' : 'prev');
        setCurrentPage(clamped);
        setAnimationKey((value) => value + 1);
        clearAllHoveredStates();
    };

    const setHoveredState = (element: HTMLDivElement, hovered: boolean) => {
        element.classList.toggle('is-hovered', hovered);
    };

    const clearAllHoveredStates = () => {
        navRef?.querySelectorAll('.social-link-slot.is-hovered').forEach((element) => {
            element.classList.remove('is-hovered');
        });
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && navRef?.contains(activeElement)) {
            activeElement.blur();
        }
    };

    const clearHoveredStateOnNavigate = (linkElement: HTMLAnchorElement) => {
        const slot = linkElement.closest('.social-link-slot');
        if (slot) {
            setHoveredState(slot as HTMLDivElement, false);
        }
        linkElement.blur();
    };

    const handleLinkClick = (event: MouseEvent, linkElement: HTMLAnchorElement) => {
        if (suppressNextClick) {
            event.preventDefault();
            event.stopPropagation();
            suppressNextClick = false;
            clearHoveredStateOnNavigate(linkElement);
            return;
        }

        clearHoveredStateOnNavigate(linkElement);
    };

    onMount(() => {
        const breatheTimer = window.setTimeout(() => setBreathe(false), 3200);
        window.addEventListener('pagehide', clearAllHoveredStates);
        window.addEventListener('pageshow', clearAllHoveredStates);

        let isDown = false;
        let startX = 0;
        let wheelLocked = false;
        let wheelSettlingTimer: number | undefined;

        const wrapper = navRef;
        if (!wrapper || totalPages() <= 1) {
            onCleanup(() => {
                window.clearTimeout(breatheTimer);
                window.removeEventListener('pagehide', clearAllHoveredStates);
                window.removeEventListener('pageshow', clearAllHoveredStates);
            });
            return;
        }

        const handlePointerDown = (e: PointerEvent) => {
            isDown = true;
            suppressNextClick = false;
            startX = e.pageX - wrapper.offsetLeft;
            wrapper.setPointerCapture(e.pointerId);
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDown) return;
            e.preventDefault();
        };

        const handlePointerUp = (e: PointerEvent) => {
            isDown = false;
            const dragX = e.pageX - wrapper.offsetLeft;
            const dragDistance = dragX - startX;
            if (Math.abs(dragDistance) < 36) return;

            suppressNextClick = true;
            window.clearTimeout(suppressClickTimer);
            suppressClickTimer = window.setTimeout(() => {
                suppressNextClick = false;
            }, 300);
            showPage(currentPage() + (dragDistance < 0 ? 1 : -1));
        };

        const renewWheelLock = () => {
            window.clearTimeout(wheelSettlingTimer);
            wheelSettlingTimer = window.setTimeout(() => {
                wheelLocked = false;
            }, 450);
        };

        const handleWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

            const direction = Math.sign(e.deltaY);
            if (direction === 0) return;

            if (wheelLocked) {
                e.preventDefault();
                renewWheelLock();
                return;
            }

            const current = currentPage();
            const target = Math.max(0, Math.min(current + direction, totalPages() - 1));
            if (target === current) return;

            e.preventDefault();
            wheelLocked = true;
            renewWheelLock();
            showPage(target);
        };

        wrapper.addEventListener('pointerdown', handlePointerDown);
        wrapper.addEventListener('pointermove', handlePointerMove);
        wrapper.addEventListener('pointerup', handlePointerUp);
        wrapper.addEventListener('wheel', handleWheel, { passive: false });

        onCleanup(() => {
            window.clearTimeout(breatheTimer);
            window.clearTimeout(wheelSettlingTimer);
            window.clearTimeout(suppressClickTimer);
            window.removeEventListener('pagehide', clearAllHoveredStates);
            window.removeEventListener('pageshow', clearAllHoveredStates);
            wrapper.removeEventListener('pointerdown', handlePointerDown);
            wrapper.removeEventListener('pointermove', handlePointerMove);
            wrapper.removeEventListener('pointerup', handlePointerUp);
            wrapper.removeEventListener('wheel', handleWheel);
        });
    });

    // 链接总数 ≤ 6 时保持原有网格布局
    if (props.config.links.length <= ITEMS_PER_PAGE) {
        return (
            <nav
                ref={(element) => (navRef = element)}
                class="social-links"
                id="socialLinks"
                classList={{ 'breathe-once': breathe() }}
            >
                {props.config.links.map((link, index) => {
                    const color =
                        link.color ?? (props.config.colorScheme === 'same' ? cycleColors[0] : cycleColors[index % 3]);
                    const isMailTo = link.url.startsWith('mailto:');

                    return (
                        <div
                            class="social-link-slot"
                            classList={{ 'is-hovered': false }}
                            onPointerEnter={(event) => setHoveredState(event.currentTarget, true)}
                            onPointerLeave={(event) => setHoveredState(event.currentTarget, false)}
                            onPointerDown={(event) => setHoveredState(event.currentTarget, true)}
                            onPointerUp={(event) => setHoveredState(event.currentTarget, false)}
                            onPointerCancel={(event) => setHoveredState(event.currentTarget, false)}
                        >
                            <a
                                href={link.url}
                                aria-label={link.name}
                                target={isMailTo ? '_self' : '_blank'}
                                rel={isMailTo ? undefined : 'noopener noreferrer'}
                                class="social-link social-link--custom"
                                style={{ '--custom-color': color }}
                                onClick={(event) => handleLinkClick(event, event.currentTarget)}
                                onBlur={(event) => {
                                    const slot = event.currentTarget.closest('.social-link-slot');
                                    if (slot) setHoveredState(slot as HTMLDivElement, false);
                                }}
                            >
                                {link.icon ? <Icon name={link.icon} class="social-icon" size="1.25rem" /> : null}
                                <span class="link-label">{link.name}</span>
                            </a>
                        </div>
                    );
                })}
            </nav>
        );
    }

    // 分页：离散页面 + 滑入动画，避免相邻页面露出接缝。
    return (
        <nav
            ref={(element) => (navRef = element)}
            class="social-links-wrapper"
            id="socialLinks"
            classList={{ 'breathe-once': breathe() }}
        >
            <div
                id="socialLinksPage"
                class="social-links-page"
                data-page-key={animationKey()}
                onAnimationEnd={() => setTransitionDirection(null)}
                classList={{
                    'is-slide-next': transitionDirection() === 'next',
                    'is-slide-prev': transitionDirection() === 'prev',
                    'is-animation-alt': animationKey() % 2 === 1
                }}
            >
                {currentLinks().map((link, index) => {
                    const globalIdx = currentPage() * ITEMS_PER_PAGE + index;
                    const color =
                        link.color ??
                        (props.config.colorScheme === 'same' ? cycleColors[0] : cycleColors[globalIdx % 3]);
                    const isMailTo = link.url.startsWith('mailto:');
                    return (
                        <div
                            class="social-link-slot"
                            classList={{ 'is-hovered': false }}
                            onPointerEnter={(event) => setHoveredState(event.currentTarget, true)}
                            onPointerLeave={(event) => setHoveredState(event.currentTarget, false)}
                            onPointerDown={(event) => setHoveredState(event.currentTarget, true)}
                            onPointerUp={(event) => setHoveredState(event.currentTarget, false)}
                            onPointerCancel={(event) => setHoveredState(event.currentTarget, false)}
                        >
                            <a
                                href={link.url}
                                aria-label={link.name}
                                target={isMailTo ? '_self' : '_blank'}
                                rel={isMailTo ? undefined : 'noopener noreferrer'}
                                class="social-link social-link--custom"
                                style={{ '--custom-color': color }}
                                onClick={(event) => handleLinkClick(event, event.currentTarget)}
                                onBlur={(event) => {
                                    const slot = event.currentTarget.closest('.social-link-slot');
                                    if (slot) setHoveredState(slot as HTMLDivElement, false);
                                }}
                            >
                                {link.icon ? <Icon name={link.icon} class="social-icon" size="1.25rem" /> : null}
                                <span class="link-label">{link.name}</span>
                            </a>
                        </div>
                    );
                })}

                {Array.from({ length: ITEMS_PER_PAGE - currentLinks().length }).map(() => (
                    <div class="social-link-slot social-link-slot--placeholder" aria-hidden="true"></div>
                ))}
            </div>

            {totalPages() > 1 && (
                <div class="social-links-dots">
                    {Array.from({ length: totalPages() }).map((_, i) => (
                        <button
                            class="social-link-dot"
                            classList={{ active: currentPage() === i }}
                            type="button"
                            aria-current={currentPage() === i ? 'page' : undefined}
                            aria-controls="socialLinksPage"
                            onClick={() => showPage(i)}
                            aria-label={`social page ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </nav>
    );
}
