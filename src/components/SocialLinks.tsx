import { createSignal, onCleanup, onMount } from 'solid-js';
import type { SocialLinksConfig } from '../types/site';
import { Icon } from './Icon';

const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];

export function SocialLinks(props: { config: SocialLinksConfig }) {
    const [breathe, setBreathe] = createSignal(true);
    let navRef: HTMLElement | undefined;

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

    onMount(() => {
        const breatheTimer = window.setTimeout(() => setBreathe(false), 3200);

        window.addEventListener('pagehide', clearAllHoveredStates);
        window.addEventListener('pageshow', clearAllHoveredStates);

        onCleanup(() => {
            window.clearTimeout(breatheTimer);
            window.removeEventListener('pagehide', clearAllHoveredStates);
            window.removeEventListener('pageshow', clearAllHoveredStates);
        });
    });

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
                            onClick={(event) => clearHoveredStateOnNavigate(event.currentTarget)}
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
