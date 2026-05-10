import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import { siteConfig } from '../data/site';
import { createI18n } from '../lib/i18n';
import { createLogger } from '../lib/logger';
import { enableContentProtection, initMobileStickyAvatar, initScrollAnimations } from '../lib/runtime-effects';
import { WallpaperScrollerController } from '../lib/wallpaper-scroller';
import { ClockPanel } from './ClockPanel';
import { MobileDockSidebar } from './MobileDockSidebar';
import { LoadingOverlay } from './LoadingOverlay';
import { SocialLinks } from './SocialLinks';
import { TopBar } from './TopBar';
import { TypewriterSlogan } from './TypewriterSlogan';

function splitLatinText(text: string) {
    return text
        .split(/([A-Za-z][A-Za-z0-9'’.-]*)/g)
        .filter(Boolean)
        .map((part) => ({
            text: part,
            isLatin: /^[A-Za-z]/.test(part)
        }));
}

export function HomepageApp() {
    const logger = createLogger(siteConfig.debug.consoleLog);
    const i18n = createI18n(siteConfig.i18n);
    const [ready, setReady] = createSignal(false);
    const [loadingText, setLoadingText] = createSignal(siteConfig.loading.texts[0]);
    const [loadingPercent, setLoadingPercent] = createSignal(0);
    const [mobileDockOpen, setMobileDockOpen] = createSignal(false);
    const [scrollProgress, setScrollProgress] = createSignal(0);

    const heroAvatarNameOpacity = () => {
        const sp = scrollProgress();
        if (sp <= 0.15) return 1;
        if (sp >= 0.4) return 0;
        return 1 - (sp - 0.15) / 0.25;
    };

    let containerRef: HTMLElement | undefined;
    let viewportRef: HTMLDivElement | undefined;
    let avatarRef: HTMLDivElement | undefined;
    let wallpaperRef: HTMLDivElement | undefined;
    let wallpaperController: WallpaperScrollerController | null = null;

    // Reactive mobile detection
    const [isMobile, setIsMobile] = createSignal(
        typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
    );

    // Cleanup registry shared across lifecycle changes
    const pageCleanups: Array<() => void> = [];

    function startWallpaperLoading() {
        if (!wallpaperRef) {
            logger.warn('Wallpaper ref not available');
            setReady(true);
            return;
        }

        wallpaperController = new WallpaperScrollerController(siteConfig.wallpaper, siteConfig.loading, {
            onLoadingTextChange: (text) => {
                setLoadingText(text);
            },
            onProgressChange: (percent) => {
                setLoadingPercent(percent);
            },
            onReady: () => {
                logger.log('Wallpaper ready — hiding loading overlay');
                setReady(true);
            }
        });

        wallpaperController.attach(wallpaperRef);
        wallpaperController.init();
    }

    function teardownWallpaper() {
        if (wallpaperController) {
            wallpaperController.destroy();
            wallpaperController = null;
        }
    }

    // React to layout mode changes: wallpaper loading only on desktop
    createEffect(() => {
        const mobile = isMobile();

        // Tear down any existing wallpaper controller
        teardownWallpaper();

        if (mobile) {
            // Mobile layout: skip wallpaper, go ready immediately
            logger.log('Mobile layout detected — skipping wallpaper loading');
            setLoadingPercent(100);
            setReady(true);
        } else {
            // Desktop layout: show loading overlay, start wallpaper
            logger.log('Desktop layout detected — starting wallpaper loading');
            setReady(false);
            setLoadingPercent(0);
            setLoadingText(siteConfig.loading.texts[0]);
            startWallpaperLoading();
        }
    });

    onMount(() => {
        if (siteConfig.contentProtection.preventCopyAndDrag) {
            pageCleanups.push(enableContentProtection(true));
        }

        if (siteConfig.effects.scrollReveal.enabled) {
            pageCleanups.push(
                initScrollAnimations(siteConfig.effects.scrollReveal.delay, siteConfig.effects.scrollReveal.offset)
            );
        }

        if (containerRef && avatarRef) {
            // Mobile sticky avatar now tracks the viewport scroll
            pageCleanups.push(initMobileStickyAvatar(viewportRef || containerRef, avatarRef));
        }

        const handleScroll = (_e: Event) => {
            if (!viewportRef) return;
            const progress = Math.min(viewportRef.scrollTop / window.innerHeight, 1);
            setScrollProgress(progress);
        };

        viewportRef?.addEventListener('scroll', handleScroll, { passive: true });
        pageCleanups.push(() => viewportRef?.removeEventListener('scroll', handleScroll));

        // Watch media query for layout changes
        const mql = window.matchMedia('(max-width: 900px)');
        const handleMediaChange = (event: MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };
        mql.addEventListener('change', handleMediaChange);
        pageCleanups.push(() => mql.removeEventListener('change', handleMediaChange));

        onCleanup(() => {
            teardownWallpaper();
            pageCleanups.forEach((cleanup) => cleanup());
        });
    });

    createEffect(() => {
        if (!containerRef) {
            return;
        }

        containerRef.classList.toggle('visible', ready());
    });

    return (
        <>
            <div class="noise-overlay"></div>
            <LoadingOverlay hidden={ready()} text={loadingText()} percent={loadingPercent()} />

            <TopBar
                config={siteConfig}
                i18n={i18n}
                scrollProgress={scrollProgress}
                onMobileMenuOpen={() => setMobileDockOpen(true)}
            />

            <div class="page-scroller" ref={viewportRef}>
                <div class="hero-sticky">
                    <div
                        class="hero-content"
                        style={{
                            transform:
                                `translateZ(${-600 * scrollProgress()}px) ` +
                                `rotateX(${15 * scrollProgress()}deg) ` +
                                `scale(${1 - 0.3 * scrollProgress()})`,
                            opacity: Math.max(1 - scrollProgress() * 1.2, 0),
                            filter: `brightness(${1 - scrollProgress() * 0.6}) ` + `blur(${scrollProgress() * 8}px)`
                        }}
                    >
                        <main class="container" ref={containerRef}>
                            <div class="wallpaper-scroll-area" ref={(element) => (wallpaperRef = element)}></div>
                            <section class="left-panel">
                                <header class="hero">
                                    <div
                                        class="avatar-box"
                                        id="avatarBox"
                                        ref={(element) => (avatarRef = element)}
                                        style={{ opacity: heroAvatarNameOpacity() }}
                                        onClick={() => {
                                            if (window.matchMedia('(max-width: 900px)').matches) {
                                                setMobileDockOpen(true);
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

                                    <h1 class="name" style={{ opacity: heroAvatarNameOpacity() }}>
                                        {splitLatinText(siteConfig.profile.name).map((part) =>
                                            part.isLatin ? <span class="name-latin">{part.text}</span> : part.text
                                        )}
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
                                    <ClockPanel config={siteConfig.time} i18n={i18n} />
                                </div>
                                <MobileDockSidebar
                                    config={siteConfig}
                                    i18n={i18n}
                                    open={mobileDockOpen()}
                                    onClose={() => setMobileDockOpen(false)}
                                />
                            </aside>
                        </main>
                    </div>
                </div>

                <div class="blog-content">
                    <div class="placeholder-content">
                        <h2>{i18n.t('nav.blog')}</h2>
                        <p style={{ opacity: 0.5 }}>Coming Soon...</p>
                        <div style={{ height: '150vh', 'background-color': 'var(--bg)' }} />
                    </div>
                </div>
            </div>
        </>
    );
}
