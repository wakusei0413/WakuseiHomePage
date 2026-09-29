// Lazy loader shared by the comment section and the view counter, so an article
// page downloads the Twikoo bundle at most once.

type TwikooModule = typeof import('twikoo').default;

// The package is a UMD bundle that sets both `exports.default = init` and `exports.init = init`.
// Depending on the bundler's interop, the namespace, its `default`, or `default.default` is the
// object that carries the whole API (production build vs Vite dev pre-bundling differ), so
// take the first layer that actually has `init`.
function findApi(mod: unknown): TwikooModule {
    let layer = mod as { init?: unknown; default?: unknown } | undefined;
    for (let depth = 0; depth < 3 && layer; depth += 1) {
        if ('init' in layer && typeof layer.init === 'function') return layer as unknown as TwikooModule;
        layer = 'default' in layer ? (layer.default as typeof layer) : undefined;
    }
    throw new Error('Twikoo bundle exposes no init()');
}

let pending: Promise<TwikooModule> | null = null;
let styles: HTMLStyleElement[] = [];

// The bundle injects its stylesheet into <head> once, when the module first evaluates.
// A View Transitions swap drops every head element the next page does not declare, and
// the cached module never runs again, so keep the tags and put them back on each load.
function restoreStyles() {
    if (typeof document === 'undefined') return;
    if (styles.length === 0) styles = [...document.querySelectorAll<HTMLStyleElement>('style[data-twikoo]')];
    for (const style of styles) {
        if (!style.isConnected) document.head.append(style);
    }
}

export function loadTwikoo(): Promise<TwikooModule> {
    pending ??= import('twikoo')
        .then((mod) => findApi(mod))
        .catch((error: unknown) => {
            pending = null;
            throw error;
        });
    return pending.then((api) => {
        restoreStyles();
        return api;
    });
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

/** Mirrors Twikoo's own rule: never bump the production view counter from a local preview. */
export function isLocalPreview(): boolean {
    return typeof window !== 'undefined' && LOCAL_HOSTS.has(window.location.hostname);
}
