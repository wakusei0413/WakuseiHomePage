import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import { siteConfig } from '../data/site';
import { scheduleFontAwesomeLoad } from '../lib/font-awesome';
import { createI18n } from '../lib/i18n';
import { createLogger } from '../lib/logger';
import { enableContentProtection, initMobileStickyAvatar, initScrollAnimations } from '../lib/runtime-effects';
import { WallpaperScrollerController } from '../lib/wallpaper-scroller';
import { ClockPanel } from './ClockPanel';
import { NavigationDock } from './NavigationDock';
import { MobileDockSidebar } from './MobileDockSidebar';
import { LoadingOverlay } from './LoadingOverlay';
import { SocialLinks } from './SocialLinks';
import { TypewriterSlogan } from './TypewriterSlogan';

export function HomepageApp() {
    const logger = createLogger(siteConfig.debug.consoleLog);
    const i18n = createI18n(siteConfig.i18n);
    const [ready, setReady] = createSignal(false);
    const [loadingText, setLoadingText] = createSignal(siteConfig.loading.texts[0]);
    const [loadingPercent, setLoadingPercent] = createSignal(0);
    const [mobileDockOpen, setMobileDockOpen] = createSignal(false);

    let containerRef: HTMLElement | undefined;
    let avatarRef: HTMLDivElement | undefined;
    let wallpaperRef: HTMLDivElement | undefined;

    onMount(() => {
        const cleanups: Array<() => void> = [];

        if (siteConfig.contentProtection.preventCopyAndDrag) {
            cleanups.push(enableContentProtection(true));
        }

        if (siteConfig.effects.scrollReveal.enabled) {
            cleanups.push(
                initScrollAnimations(siteConfig.effects.scrollReveal.delay, siteConfig.effects.scrollReveal.offset)
            );
        }

        if (containerRef && avatarRef) {
            cleanups.push(initMobileStickyAvatar(containerRef, avatarRef));
        }

        scheduleFontAwesomeLoad(siteConfig.socialLinks.links, {
            requestIdleCallback: window.requestIdleCallback?.bind(window)
        });

        if (wallpaperRef) {
            const wallpaperController = new WallpaperScrollerController(siteConfig.wallpaper, siteConfig.loading, {
                onLoadingTextChange: setLoadingText,
                onProgressChange: setLoadingPercent,
                onReady: () => {
                    logger.log('Wallpaper ready');
                    setReady(true);
                }
            });

            wallpaperController.attach(wallpaperRef);
            wallpaperController.init();
            cleanups.push(() => wallpaperController.destroy());
        } else {
            setReady(true);
        }

        onCleanup(() => {
            cleanups.forEach((cleanup) => cleanup());
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

            <main class="container" ref={containerRef}>
                <section class="left-panel">
                    <header class="hero">
                        <div
                            class="avatar-box"
                            id="avatarBox"
                            ref={(element) => (avatarRef = element)}
                            onClick={() => {
                                if (window.matchMedia('(max-width: 900px)').matches) {
                                    setMobileDockOpen(true);
                                }
                            }}
                        >
                            <img
                                src={siteConfig.profile.avatar}
                                alt="Avatar"
                                class="avatar-image"
                                decoding="async"
                                fetchpriority="high"
                            />
                        </div>

                        <h1 class="name">{siteConfig.profile.name}</h1>

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
                    <div class="wallpaper-scroll-area" ref={(element) => (wallpaperRef = element)}></div>
                    <div class="right-panel-shadow"></div>
                    <div class="info-panel">
                        <ClockPanel config={siteConfig.time} i18n={i18n} />
                    </div>
                    <NavigationDock config={siteConfig} i18n={i18n} />
                    <MobileDockSidebar
                        config={siteConfig}
                        i18n={i18n}
                        open={mobileDockOpen()}
                        onClose={() => setMobileDockOpen(false)}
                    />
                </aside>
            </main>

            <button class="wallpaper-toggle" aria-label="查看壁纸" title="查看壁纸">
                <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span class="sr-only">查看壁纸</span>
            </button>

            <button class="close-panel" aria-label="关闭">
                <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span class="sr-only">关闭</span>
            </button>
        </>
    );
}
