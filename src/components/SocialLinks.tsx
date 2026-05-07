import type { SocialLinksConfig } from '../types/site';
import { createSignal, onMount } from 'solid-js';
import { Icon } from './Icon';

const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];

export function SocialLinks(props: { config: SocialLinksConfig }) {
    const [breathe, setBreathe] = createSignal(true);

    onMount(() => {
        window.setTimeout(() => setBreathe(false), 3200);
    });

    const setHoveredState = (element: HTMLDivElement, hovered: boolean) => {
        element.classList.toggle('is-hovered', hovered);
    };

    return (
        <nav class="social-links" id="socialLinks" classList={{ 'breathe-once': breathe() }}>
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
                    >
                        <a
                            href={link.url}
                            aria-label={link.name}
                            target={isMailTo ? '_self' : '_blank'}
                            rel={isMailTo ? undefined : 'noopener noreferrer'}
                            class="social-link social-link--custom"
                            style={{ '--custom-color': color }}
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
