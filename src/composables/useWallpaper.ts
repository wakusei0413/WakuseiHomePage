import { ref, onMounted, onUnmounted, watch } from 'vue';
import { WallpaperScrollerController } from '../lib/wallpaper-scroller';
import { useLogger } from './useLogger';
import type { WallpaperConfig, LoadingConfig } from '../types/site';

export function useWallpaper(
    wallpaperConfig: WallpaperConfig,
    loadingConfig: LoadingConfig,
    isMobile: () => boolean
) {
    const logger = useLogger(true);
    const wallpaperRef = ref<HTMLDivElement | null>(null);
    const ready = ref(false);
    let controller: WallpaperScrollerController | null = null;

    function teardown() {
        if (controller) {
            controller.destroy();
            controller = null;
        }
    }

    function startLoading() {
        const el = wallpaperRef.value;
        if (!el) {
            logger.warn('Wallpaper ref not available');
            ready.value = true;
            return;
        }
        controller = new WallpaperScrollerController(wallpaperConfig, loadingConfig, {
            onReady: () => {
                logger.log('Wallpaper ready - showing homepage content');
                ready.value = true;
            }
        });
        controller.attach(el);
        controller.init();
    }

    onMounted(() => {
        watch(
            isMobile,
            (mobile) => {
                teardown();
                if (mobile) {
                    logger.log('Mobile layout detected - skipping wallpaper loading');
                    ready.value = true;
                } else {
                    logger.log('Desktop layout detected - starting wallpaper loading');
                    ready.value = false;
                    startLoading();
                }
            },
            { immediate: true }
        );
    });

    onUnmounted(() => {
        teardown();
    });

    return { wallpaperRef, ready };
}
