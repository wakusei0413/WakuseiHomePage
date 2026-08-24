// Shared client-side scroll helpers for the article reading UI.
// SSR-safe: these functions touch the DOM, so only call them from mounted /
// event contexts — never from module top-level or during server render.

/** How close (px) the article body's top must be to the viewport top before
 *  we consider reading to have "started" (i.e. the header has scrolled away). */
export const ARTICLE_START_THRESHOLD = 120;

/**
 * True once the reader has scrolled past the article header and the post body
 * has reached the top band of the scroller viewport.
 */
export function isArticleStarted(scroller: HTMLElement | null): boolean {
    if (!scroller) return false;
    const body = scroller.querySelector('.post-body');
    if (!(body instanceof HTMLElement)) return false;
    return body.getBoundingClientRect().top <= ARTICLE_START_THRESHOLD;
}
