<script lang="ts">
    import { onMount } from 'svelte';
    import { siteConfig } from '../data/site';
    import Footer from './Footer.svelte';
    import MobileDockSidebar from './MobileDockSidebar.svelte';
    import TopBar from './TopBar.svelte';

    let { initialIsHomePage }: { initialIsHomePage: boolean } = $props();

    let isHomePage = $state(initialIsHomePage);

    function checkHomePage() {
        isHomePage = document.querySelector('.page-scroller') !== null;
    }

    onMount(() => {
        checkHomePage();
        window.addEventListener('wakusei:homepage-mounted', checkHomePage);
        document.addEventListener('astro:after-swap', checkHomePage);
        return () => {
            window.removeEventListener('wakusei:homepage-mounted', checkHomePage);
            document.removeEventListener('astro:after-swap', checkHomePage);
        };
    });
</script>

<div class="noise-overlay"></div>
<TopBar initialIsHomePage={isHomePage} />
{#if !isHomePage}
    <Footer
        links={siteConfig.footer.links}
        socialLinks={siteConfig.socialLinks.links}
        copyrightText={siteConfig.footer.text}
    />
{/if}
<MobileDockSidebar />
