declare module 'twikoo' {
    export interface TwikooOptions {
        envId: string;
        el?: string | Element;
        /** Thread key; defaults to `location.pathname`. */
        path?: string;
        lang?: string;
        /** Base URL of the directory that holds `locales/<name>.js` chunks. */
        localeBaseUrl?: string;
    }

    export function init(options: TwikooOptions): Promise<void>;
    export function getVisitorsCount(options: TwikooOptions): Promise<{ time?: number } | null>;

    const twikoo: {
        init: typeof init;
        getVisitorsCount: typeof getVisitorsCount;
    };
    export default twikoo;
}
