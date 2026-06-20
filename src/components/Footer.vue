<script setup lang="ts">
import Icon from './Icon.vue';
import { useI18n } from '../composables/useI18n';
import type { FooterLink, SocialLink } from '../types/site';

defineProps<{
    links: FooterLink[];
    socialLinks: SocialLink[];
    copyrightText: string;
}>();

const { t } = useI18n();

function isExternalLink(href: string) {
    return /^https?:\/\//.test(href);
}
</script>

<template>
    <footer class="site-footer">
        <div class="footer-main">
            <div class="footer-links-section">
                <h3 class="footer-section-title">
                    {{ t('footer.links') }}
                </h3>
                <ul class="footer-links">
                    <li v-for="link in links" :key="link.href">
                        <a
                            :href="link.href"
                            :target="isExternalLink(link.href) ? '_blank' : undefined"
                            :rel="isExternalLink(link.href) ? 'noopener noreferrer' : undefined"
                        >
                            {{ link.name }}
                        </a>
                    </li>
                </ul>
            </div>

            <div class="footer-socials">
                <h3 class="footer-section-title">
                    {{ t('footer.socials') }}
                </h3>
                <div class="footer-social-icons">
                    <a
                        v-for="link in socialLinks"
                        :key="link.url"
                        :href="link.url"
                        class="footer-social-icon"
                        :aria-label="link.name"
                        target="_blank"
                        rel="noopener noreferrer"
                        :title="link.name"
                    >
                        <Icon v-if="link.icon" :name="link.icon" size="1.25rem" />
                        <template v-else>{{ link.name.charAt(0) }}</template>
                    </a>
                </div>
            </div>
        </div>

        <div class="footer-divider" />

        <div class="footer-bottom">
            <span class="footer-copyright">{{ copyrightText }}</span>
            <span class="footer-tagline">Stay hydrated</span>
        </div>
    </footer>
</template>
