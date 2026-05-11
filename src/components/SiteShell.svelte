<script lang="ts">
    import { onMount } from 'svelte';
    import { siteConfig } from '../data/site';
    import { subscribeHomePageStateChange } from '../lib/homepage-context';
    import Footer from './Footer.svelte';
    import MobileDockSidebar from './MobileDockSidebar.svelte';
    import TopBar from './TopBar.svelte';

    let { initialIsHomePage }: { initialIsHomePage: boolean } = $props();

    let isHomePage = $state(initialIsHomePage);

    onMount(() => {
        const cleanup = subscribeHomePageStateChange((next) => {
            isHomePage = next;
        });

        return () => {
            cleanup();
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
