<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { siteConfig } from '../data/site';
import { useHomepage } from '../composables/useHomepage';
import Footer from './Footer.vue';
import MobileDockSidebar from './MobileDockSidebar.vue';
import TopBar from './TopBar.vue';

const props = defineProps<{ initialIsHomePage: boolean }>();

const isHomePage = ref(props.initialIsHomePage);

onMounted(() => {
    const { subscribeStateChange } = useHomepage();
    const cleanup = subscribeStateChange((next) => {
        isHomePage.value = next;
    });

    return () => {
        cleanup();
    };
});
</script>

<template>
    <div class="noise-overlay" />
    <TopBar :initial-is-home-page="isHomePage" />
    <Footer
        v-if="!isHomePage"
        :links="siteConfig.footer.links"
        :social-links="siteConfig.socialLinks.links"
        :copyright-text="siteConfig.footer.text"
    />
    <MobileDockSidebar />
</template>
