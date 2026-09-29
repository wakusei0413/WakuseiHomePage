import type { Locale } from '../data/i18n';
import { resolveLocalizedPath } from './i18n-routing';
import type { SearchIndexEntry } from './search';

// One cached request per locale: switching languages navigates to a different route
// tree, and each tree ships the article set written in its own language.
const clientSearchIndexes = new Map<Locale, Promise<SearchIndexEntry[]>>();

export function loadClientSearchIndex(locale: Locale): Promise<SearchIndexEntry[]> {
    const cached = clientSearchIndexes.get(locale);
    if (cached) return cached;

    const url = resolveLocalizedPath('/search-index.json', locale);
    const pending = fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`${url} ${response.status}`);
            }
            return response.json() as Promise<SearchIndexEntry[]>;
        })
        .catch((error: unknown) => {
            clientSearchIndexes.delete(locale);
            throw error;
        });

    clientSearchIndexes.set(locale, pending);
    return pending;
}
