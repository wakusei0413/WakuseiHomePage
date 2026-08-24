import { siteConfig } from '../data/site';
import { dispatchPageShellStateChange, getPageShellStateFromDocument } from '../lib/page-shell-context';

declare global {
    interface Window {
        __wakuseiNavigationRuntimeInitialized?: boolean;
    }
}

type AstroSwapEvent = Event & {
    newDocument: Document;
};

const DARK_THEME_BG = '#080808';
const SHOW_DELAY = 120;
let incomingIsHomePage = document.documentElement.classList.contains('is-home');

function getNavigationProgressElements() {
    const progress = document.getElementById('navigationProgress');
    const bar = document.getElementById('navigationProgressBar');
    return { progress, bar };
}

function getActiveTheme() {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark' || currentTheme === 'light') return currentTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
}

function applyHomePageChromeState(isHome: boolean) {
    const h = document.documentElement;
    const b = document.body;
    if (isHome) {
        h.classList.add('is-home');
        b.classList.add('is-home');
    } else {
        h.classList.remove('is-home');
        b.classList.remove('is-home');
    }
}

function createNavigationProgressRuntime() {
    let showTimer: number | undefined;
    let trickleTimer: number | undefined;
    let hideTimer: number | undefined;
    let resourceTimeout: number | undefined;
    let resourceProbeTimer: number | undefined;
    let pendingReadyHandler: (() => void) | undefined;
    let progressVisible = false;
    let value = 0;
    let navigationEpoch = 0;

    function setValue(nextValue: number) {
        const elements = getNavigationProgressElements();
        value = Math.max(value, Math.min(nextValue, 100));
        if (elements.bar) elements.bar.style.transform = `scaleX(${value / 100})`;
    }

    function clearPendingResourceWait() {
        if (resourceTimeout) {
            window.clearTimeout(resourceTimeout);
            resourceTimeout = undefined;
        }
        if (resourceProbeTimer) {
            window.clearTimeout(resourceProbeTimer);
            resourceProbeTimer = undefined;
        }
        if (pendingReadyHandler) {
            window.removeEventListener('wakusei:homepage-ready', pendingReadyHandler);
            window.removeEventListener('wakusei:shell-ready', pendingReadyHandler);
            pendingReadyHandler = undefined;
        }
    }

    function isIncomingHomeReady() {
        const carrier = document.getElementById('pageTransitionSurface');
        const isHome = carrier && carrier.dataset.isHome === 'true';
        if (!isHome) return false;
        return !!document.querySelector('.container.visible');
    }

    function reset() {
        const elements = getNavigationProgressElements();
        window.clearTimeout(showTimer);
        window.clearInterval(trickleTimer);
        window.clearTimeout(hideTimer);
        clearPendingResourceWait();
        progressVisible = false;
        value = 0;
        if (elements.bar) elements.bar.style.transform = 'scaleX(0)';
        if (elements.progress) {
            elements.progress.classList.remove('navigation-progress--visible');
            elements.progress.classList.remove('navigation-progress--done');
        }
    }

    function start() {
        navigationEpoch += 1;
        reset();
        progressVisible = true;
        showTimer = window.setTimeout(() => {
            const elements = getNavigationProgressElements();
            if (!elements.progress) return;
            elements.progress.classList.add('navigation-progress--visible');
            setValue(12);
            trickleTimer = window.setInterval(() => {
                setValue(value + Math.max(1, (88 - value) * 0.12));
            }, 180);
        }, SHOW_DELAY);
    }

    function finish() {
        const elements = getNavigationProgressElements();
        window.clearTimeout(showTimer);
        window.clearInterval(trickleTimer);
        clearPendingResourceWait();
        if (!elements.progress) return;
        if (!progressVisible) {
            reset();
            return;
        }
        elements.progress.classList.add('navigation-progress--visible');
        setValue(100);
        elements.progress.classList.add('navigation-progress--done');
        hideTimer = window.setTimeout(reset, 260);
    }

    function waitForResources() {
        clearPendingResourceWait();
        const epoch = navigationEpoch;

        if (!incomingIsHomePage) {
            finish();
            return;
        }

        function settle() {
            if (epoch !== navigationEpoch) return;
            finish();
        }

        pendingReadyHandler = () => {
            settle();
        };

        window.addEventListener('wakusei:homepage-ready', pendingReadyHandler);
        window.addEventListener('wakusei:shell-ready', pendingReadyHandler);

        resourceTimeout = window.setTimeout(settle, 10000);

        resourceProbeTimer = window.setTimeout(() => {
            if (epoch !== navigationEpoch) return;
            if (isIncomingHomeReady()) {
                settle();
            }
        }, 0);
    }

    document.addEventListener('astro:before-preparation', start);
    document.addEventListener('astro:after-swap', waitForResources);
}

function initNavigationRuntime() {
    if (window.__wakuseiNavigationRuntimeInitialized) return;
    window.__wakuseiNavigationRuntimeInitialized = true;

    createNavigationProgressRuntime();

    document.addEventListener('astro:before-swap', (event) => {
        const swapEvent = event as AstroSwapEvent;
        swapEvent.newDocument.documentElement.classList.add('is-loaded');
        swapEvent.newDocument.documentElement.classList.remove('is-entering');

        incomingIsHomePage =
            swapEvent.newDocument.documentElement.classList.contains('is-home') ||
            swapEvent.newDocument.body.classList.contains('is-home');
        dispatchPageShellStateChange(getPageShellStateFromDocument(swapEvent.newDocument));

        const theme = getActiveTheme();
        const nextThemeColor = theme === 'dark' ? DARK_THEME_BG : siteConfig.themeColor;
        swapEvent.newDocument.documentElement.setAttribute('data-theme', theme);
        const incomingThemeColor = swapEvent.newDocument.querySelector('meta[name="theme-color"]');
        if (incomingThemeColor) incomingThemeColor.setAttribute('content', nextThemeColor);
    });

    document.addEventListener('astro:after-swap', () => {
        applyHomePageChromeState(incomingIsHomePage);
    });
}

initNavigationRuntime();
