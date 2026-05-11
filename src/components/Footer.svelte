<script lang="ts">
    import Icon from './Icon.svelte';
    import type { FooterLink, SocialLink } from '../types/site';

    let {
        links,
        socialLinks,
        copyrightText
    }: { links: FooterLink[]; socialLinks: SocialLink[]; copyrightText: string } = $props();
</script>

<footer class="site-footer">
    <div class="footer-main">
        <div class="footer-links-section">
            <h3 class="footer-section-title">Links</h3>
            <ul class="footer-links">
                {#each links as link}
                    <li>
                        <a href={link.href} target="_blank" rel="noopener noreferrer">{link.name}</a>
                    </li>
                {/each}
            </ul>
        </div>

        <div class="footer-socials">
            <h3 class="footer-section-title">Socials</h3>
            <div class="footer-social-icons">
                {#each socialLinks as link}
                    <a
                        href={link.url}
                        class="footer-social-icon"
                        aria-label={link.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.name}
                    >
                        {#if link.icon}
                            <Icon name={link.icon} size="1.25rem" />
                        {:else}
                            {link.name.charAt(0)}
                        {/if}
                    </a>
                {/each}
            </div>
        </div>
    </div>

    <div class="footer-divider"></div>

    <div class="footer-bottom">
        <span class="footer-copyright">{copyrightText}</span>
        <span class="footer-tagline">Stay hydrated</span>
    </div>
</footer>
