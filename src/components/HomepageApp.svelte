<script lang="ts">
    import { onMount } from 'svelte';
    import { siteConfig } from '../data/site';
    import { createLogger } from '../lib/logger';
    import { enableContentProtection, initMobileStickyAvatar, initScrollAnimations } from '../lib/runtime-effects';
    import { WallpaperScrollerController } from '../lib/wallpaper-scroller';
    import ClockPanel from './ClockPanel.svelte';
    import Footer from './Footer.svelte';
    import SocialLinks from './SocialLinks.svelte';
    import TypewriterSlogan from './TypewriterSlogan.svelte';

    const logger = createLogger(siteConfig.debug.consoleLog);

    let ready = $state(false);
    let scrollProgress = $state(0);

    let heroAvatarNameOpacity = $derived.by(() => {
        const sp = scrollProgress;
        if (sp <= 0.15) return 1;
        if (sp >= 0.4) return 0;
        return 1 - (sp - 0.15) / 0.25;
    });

    let containerRef: HTMLElement | undefined = $state();
    let viewportRef: HTMLDivElement | undefined = $state();
    let avatarRef: HTMLDivElement | undefined = $state();
    let wallpaperRef: HTMLDivElement | undefined = $state();
    let wallpaperController: WallpaperScrollerController | null = null;

    let isMobile = $state(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);

    const pageCleanups: Array<() => void> = [];

    function startWallpaperLoading() {
        const wref = wallpaperRef;
        if (!wref) {
            logger.warn('Wallpaper ref not available');
            ready = true;
            return;
        }

        wallpaperController = new WallpaperScrollerController(siteConfig.wallpaper, siteConfig.loading, {
            onReady: () => {
                logger.log('Wallpaper ready - showing homepage content');
                ready = true;
            }
        });

        wallpaperController.attach(wref);
        wallpaperController.init();
    }

    function teardownWallpaper() {
        if (wallpaperController) {
            wallpaperController.destroy();
            wallpaperController = null;
        }
    }

    $effect(() => {
        const mobile = isMobile;
        teardownWallpaper();

        if (mobile) {
            logger.log('Mobile layout detected - skipping wallpaper loading');
            ready = true;
        } else {
            logger.log('Desktop layout detected - starting wallpaper loading');
            ready = false;
            startWallpaperLoading();
        }
    });

    onMount(() => {
        window.dispatchEvent(new CustomEvent('wakusei:homepage-mounted'));

        if (siteConfig.contentProtection.preventCopyAndDrag) {
            pageCleanups.push(enableContentProtection(true));
        }

        if (siteConfig.effects.scrollReveal.enabled) {
            pageCleanups.push(
                initScrollAnimations(siteConfig.effects.scrollReveal.delay, siteConfig.effects.scrollReveal.offset)
            );
        }

        const container = containerRef;
        const avatar = avatarRef;
        if (container && avatar) {
            pageCleanups.push(initMobileStickyAvatar(viewportRef || container, avatar));
        }

        const ref = viewportRef;
        if (ref) {
            const handleScroll = (_e: Event) => {
                scrollProgress = Math.min(ref.scrollTop / window.innerHeight, 1);
            };
            ref.addEventListener('scroll', handleScroll, { passive: true });
            pageCleanups.push(() => ref.removeEventListener('scroll', handleScroll));
        }

        const mql = window.matchMedia('(max-width: 900px)');
        const handleMediaChange = (event: MediaQueryListEvent) => {
            isMobile = event.matches;
        };
        mql.addEventListener('change', handleMediaChange);
        pageCleanups.push(() => mql.removeEventListener('change', handleMediaChange));

        return () => {
            teardownWallpaper();
            pageCleanups.forEach((cleanup) => cleanup());
        };
    });

    $effect(() => {
        const container = containerRef;
        if (!container) return;
        container.classList.toggle('visible', ready);
        if (ready) {
            window.dispatchEvent(new CustomEvent('wakusei:homepage-ready'));
        }
    });

    function splitLatinText(text: string) {
        return text
            .split(/([A-Za-z][A-Za-z0-9'.-]*)/g)
            .filter(Boolean)
            .map((part) => ({ text: part, isLatin: /^[A-Za-z]/.test(part) }));
    }

    let heroStyle = $derived.by(() => {
        return (
            'transform: ' +
            `translateZ(${-600 * scrollProgress}px) ` +
            `rotateX(${15 * scrollProgress}deg) ` +
            `scale(${1 - 0.3 * scrollProgress}); ` +
            `opacity: ${Math.max(1 - scrollProgress * 1.2, 0)}; ` +
            `filter: brightness(${1 - scrollProgress * 0.6}) blur(${scrollProgress * 8}px)`
        );
    });
</script>

<div class="page-scroller" bind:this={viewportRef}>
    <div class="hero-sticky">
        <div class="hero-content" style={heroStyle}>
            <main class="container" bind:this={containerRef}>
                <div class="wallpaper-scroll-area" bind:this={wallpaperRef}></div>
                <section class="left-panel">
                    <header class="hero">
                        <div
                            class="avatar-box"
                            id="avatarBox"
                            bind:this={avatarRef}
                            style="opacity: {heroAvatarNameOpacity}"
                            onclick={() => {
                                if (window.matchMedia('(max-width: 900px)').matches) {
                                    window.dispatchEvent(new CustomEvent('wakusei:open-mobile-menu'));
                                } else if (viewportRef) {
                                    viewportRef.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
                                }
                            }}
                        >
                            <img
                                src={siteConfig.profile.avatar}
                                alt="Avatar"
                                class="avatar-image"
                                width="150"
                                height="150"
                                loading="eager"
                                decoding="async"
                                fetchpriority="high"
                            />
                        </div>

                        <h1 class="name" style="opacity: {heroAvatarNameOpacity}">
                            {#each splitLatinText(siteConfig.profile.name) as part}
                                {#if part.isLatin}
                                    <span class="name-latin">{part.text}</span>
                                {:else}
                                    {part.text}
                                {/if}
                            {/each}
                        </h1>

                        <div class="status-bar">
                            <span class="status-dot"></span>
                            <span class="status-text">{siteConfig.profile.status}</span>
                        </div>

                        <div class="bio-container" id="bioContainer">
                            <TypewriterSlogan
                                config={siteConfig.slogans}
                                cursorStyle={siteConfig.animation.cursorStyle}
                            />
                        </div>

                        <SocialLinks config={siteConfig.socialLinks} />
                    </header>

                    <footer class="footer-left">
                        <div class="footer-line"></div>
                        <p class="footer-text">{`${siteConfig.footer.text} • ${new Date().getFullYear()}`}</p>
                    </footer>
                </section>

                <aside class="right-panel">
                    <div class="right-panel-shadow"></div>
                    <div class="info-panel">
                        <ClockPanel config={siteConfig.time} />
                    </div>
                </aside>
            </main>
        </div>
    </div>

    <div class="blog-content">
        <Footer
            links={siteConfig.footer.links}
            socialLinks={siteConfig.socialLinks.links}
            copyrightText={siteConfig.footer.text}
        />
    </div>
</div>
