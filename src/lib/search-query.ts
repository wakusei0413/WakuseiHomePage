/**
 * The search page keeps its query in `?q=` so a result set is shareable and
 * bookmarkable, and so the `SearchAction` in the site's structured data points
 * at a URL that actually works.
 */
export const SEARCH_QUERY_PARAM = 'q';

export function readSearchQuery(search: string): string {
    return new URLSearchParams(search).get(SEARCH_QUERY_PARAM) ?? '';
}

/**
 * Returns the path (+ query + hash) to `replaceState` for the given input.
 * Deliberately path-only: `window.history.replaceState` must not be handed a
 * cross-origin URL, and callers pass `window.location.href`.
 */
export function writeSearchQuery(href: string, query: string): string {
    const url = new URL(href, 'https://localhost');
    const trimmed = query.trim();

    if (trimmed) {
        url.searchParams.set(SEARCH_QUERY_PARAM, trimmed);
    } else {
        url.searchParams.delete(SEARCH_QUERY_PARAM);
    }

    return `${url.pathname}${url.search}${url.hash}`;
}

/** Absolute target for the `SearchAction` entry point. */
export function createSearchUrlTemplate(siteUrl: string | URL): string {
    return `${new URL('/search', siteUrl).toString()}?${SEARCH_QUERY_PARAM}={search_term_string}`;
}
