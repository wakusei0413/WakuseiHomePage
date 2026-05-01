import type { SocialLinksConfig } from '../types/site';
import type { I18nContext } from '../lib/i18n';

const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];

export function SocialLinks(props: { config: SocialLinksConfig; i18n: I18nContext }) {
    const getLinkName = (name: string): string => {
        const key = `social.${name.toLowerCase().replace(/\./g, '')}`;
        const translated = props.i18n.t(key);
        return translated === key ? name : translated;
    };

    const setHoveredState = (element: HTMLDivElement, hovered: boolean) => {
        element.classList.toggle('is-hovered', hovered);
    };

    return (
        <nav class="social-links" id="socialLinks">
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
                        onBlur={(event) => setHoveredState(event.currentTarget as HTMLDivElement, false)}
                    >
                        <a
                            href={link.url}
                            aria-label={link.name}
                            target={isMailTo ? '_self' : '_blank'}
                            rel={isMailTo ? undefined : 'noopener noreferrer'}
                            class="social-link social-link--custom"
                            style={{ '--custom-color': color }}
                        >
                            {link.icon ? <i class={link.icon} aria-hidden="true"></i> : null}
                            <span class="link-label">{getLinkName(link.name)}</span>
                        </a>
                    </div>
                );
            })}
        </nav>
    );
}