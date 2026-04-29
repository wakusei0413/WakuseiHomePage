import type { SocialLinksConfig } from '../types/site';

const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];

export function SocialLinks(props: { config: SocialLinksConfig }) {
    return (
        <nav class="social-links" id="socialLinks">
            {props.config.links.map((link, index) => {
                const color =
                    link.color ?? (props.config.colorScheme === 'same' ? cycleColors[0] : cycleColors[index % 3]);
                const isMailTo = link.url.startsWith('mailto:');

                return (
                    <div class="social-link-slot">
                        <a
                            href={link.url}
                            aria-label={link.name}
                            target={isMailTo ? '_self' : '_blank'}
                            rel={isMailTo ? undefined : 'noopener noreferrer'}
                            class="social-link social-link--custom"
                            style={{ '--custom-color': color }}
                        >
                            {link.icon ? <i class={link.icon} aria-hidden="true"></i> : null}
                            <span class="link-label">{link.name}</span>
                        </a>
                    </div>
                );
            })}
        </nav>
    );
}
