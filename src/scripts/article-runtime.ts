import './internal-nav';
import './reading-progress';

const IDLE_TIMEOUT = 1200;

type IdleWindow = Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
};

let generation = 0;
let cancelScheduledIdle: (() => void) | null = null;
let activeTeardowns: Array<() => void> = [];

function cancelPendingEnhancements(): void {
    generation += 1;
    cancelScheduledIdle?.();
    cancelScheduledIdle = null;
}

function teardownActiveEnhancements(): void {
    activeTeardowns.forEach((teardown) => teardown());
    activeTeardowns = [];
}

async function loadEnhancements(root: HTMLElement, scheduledGeneration: number): Promise<void> {
    const [codeBlocks, headingLinks, imageLightbox] = await Promise.all([
        import('./copy-code'),
        import('./copy-heading-link'),
        import('./image-lightbox')
    ]);

    if (scheduledGeneration !== generation || !root.isConnected) return;

    codeBlocks.enhanceCodeBlocks(root);
    headingLinks.enhanceHeadingLinks(root);
    imageLightbox.enhanceImageLightbox(root);
    activeTeardowns = [
        codeBlocks.teardownCodeBlocks,
        headingLinks.teardownHeadingLinks,
        imageLightbox.teardownImageLightbox
    ];
}

export function scheduleArticleEnhancements(): void {
    cancelPendingEnhancements();
    teardownActiveEnhancements();

    const root = document.querySelector<HTMLElement>('.post-body');
    if (!root) return;

    const scheduledGeneration = generation;
    const run = () => {
        cancelScheduledIdle = null;
        void loadEnhancements(root, scheduledGeneration).catch((error: unknown) => {
            if (scheduledGeneration === generation) {
                console.error('Failed to load article enhancements.', error);
            }
        });
    };

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
        const handle = idleWindow.requestIdleCallback(run, { timeout: IDLE_TIMEOUT });
        cancelScheduledIdle = () => idleWindow.cancelIdleCallback?.(handle);
        return;
    }

    const timer = window.setTimeout(run, IDLE_TIMEOUT);
    cancelScheduledIdle = () => window.clearTimeout(timer);
}

export function teardownArticleEnhancements(): void {
    cancelPendingEnhancements();
    teardownActiveEnhancements();
}

scheduleArticleEnhancements();
document.addEventListener('astro:page-load', scheduleArticleEnhancements);
document.addEventListener('astro:before-swap', teardownArticleEnhancements);
