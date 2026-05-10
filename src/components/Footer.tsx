import type { FooterLink, SocialLink } from '../types/site';
import { Icon } from './Icon';

interface FooterProps {
    links: FooterLink[];
    socialLinks: SocialLink[];
    copyrightText: string;
}

export function Footer(props: FooterProps) {
    return (
        <footer class="site-footer">
            <div class="footer-main">
                <div class="footer-links-section">
                    <h3 class="footer-section-title">Links</h3>
                    <ul class="footer-links">
                        {props.links.map((link) => (
                            <li>
                                <a href={link.href} target="_blank" rel="noopener noreferrer">
                                    {link.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div class="footer-socials">
                    <h3 class="footer-section-title">Socials</h3>
                    <div class="footer-social-icons">
                        {props.socialLinks.map((link) => (
                            <a
                                href={link.url}
                                class="footer-social-icon"
                                aria-label={link.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={link.name}
                            >
                                {link.icon ? <Icon name={link.icon} size="1.25rem" /> : link.name.charAt(0)}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div class="footer-divider"></div>

            <div class="footer-bottom">
                <span class="footer-copyright">{props.copyrightText}</span>
                <span class="footer-tagline">Stay hydrated</span>
            </div>
        </footer>
    );
}
