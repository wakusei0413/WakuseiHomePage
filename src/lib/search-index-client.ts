import type { SearchIndexEntry } from './search';

let clientSearchIndex: Promise<SearchIndexEntry[]> | null = null;

export function loadClientSearchIndex(): Promise<SearchIndexEntry[]> {
    clientSearchIndex ??= fetch('/search-index.json')
        .then((response) => {
            if (!response.ok) {
                throw new Error(`search-index.json ${response.status}`);
            }
            return response.json() as Promise<SearchIndexEntry[]>;
        })
        .catch((error: unknown) => {
            clientSearchIndex = null;
            throw error;
        });

    return clientSearchIndex;
}
