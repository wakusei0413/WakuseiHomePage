/**
 * Lite mode: an automatic fallback for poor network connections. Everyone else
 * gets the full design, unchanged.
 *
 * The decision is made exactly once per page load by {@link LITE_MODE_BOOT_SCRIPT},
 * inlined into `<head>` so the attribute is on `<html>` before first paint and CSS
 * never renders the heavy effects in the first place. Islands only read the result
 * through {@link isLiteMode}; nothing else re-derives it.
 *
 * What lite mode turns off is documented in docs/performance.md.
 */

export const LITE_MODE_ATTRIBUTE = 'data-perf';
export const LITE_MODE_VALUE = 'lite';

/**
 * ES5 on purpose: it runs before anything else and must not throw on older
 * engines. Only network signals trigger it (any one is enough) — device class
 * does not, so capable-network visitors always see the original design:
 * - Save-Data (the browser's data-saver switch);
 * - a slow-2g / 2g / 3g effective connection type (Network Information API,
 *   Chromium-based browsers only; other browsers never report a slow network);
 * - `prefers-reduced-data`.
 *
 * Astro's ClientRouter replaces the attributes of `<html>` on every client-side
 * navigation, so the result is re-applied after each swap.
 */
export const LITE_MODE_BOOT_SCRIPT = `(function () {
    var nav = window.navigator || {};
    var lite = false;
    try {
        var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
        if (conn) {
            if (conn.saveData) lite = true;
            if (/^(slow-2g|2g|3g)$/.test(conn.effectiveType || '')) lite = true;
        }
        if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) lite = true;
    } catch (e) {}
    function apply() {
        if (lite) document.documentElement.setAttribute('${LITE_MODE_ATTRIBUTE}', '${LITE_MODE_VALUE}');
    }
    apply();
    document.addEventListener('astro:after-swap', apply);
})();`;

/** Whether the boot script put this page into lite mode. Always false during SSR. */
export function isLiteMode(): boolean {
    return (
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute(LITE_MODE_ATTRIBUTE) === LITE_MODE_VALUE
    );
}
