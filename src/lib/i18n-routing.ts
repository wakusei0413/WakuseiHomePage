import type { Locale } from '../data/i18n';
import { siteConfig } from '../data/site';
import type { I18nConfig } from '../types/site';

const i18nConfig = siteConfig.i18n as I18nConfig;

export const NON_DEFAULT_LOCALES: readonly Locale[] = i18nConfig.locales.filter(
    (loc) => loc !== i18nConfig.defaultLocale
);

/**
 * Extracts the locale from a URL pathname.
 * Returns 'en' for '/en' or '/en/...', 'ja' for '/ja' or '/ja/...',
 * and the default locale ('zh-CN') otherwise.
 */
export function extractLocaleFromPath(pathname: string): Locale {
    const trimmed = pathname.replace(/^\/+/, '');
    const firstSegment = trimmed.split('/')[0];
    if (firstSegment && NON_DEFAULT_LOCALES.includes(firstSegment as Locale)) {
        return firstSegment as Locale;
    }
    return i18nConfig.defaultLocale;
}

/**
 * Strips any non-default locale prefix from a pathname.
 * e.g. '/en/archives' -> '/archives', '/ja/' -> '/', '/posts/foo' -> '/posts/foo'
 */
export function stripLocalePrefix(pathname: string): string {
    const trimmed = pathname.replace(/^\/+/, '');
    const segments = trimmed.split('/');
    if (segments[0] && NON_DEFAULT_LOCALES.includes(segments[0] as Locale)) {
        const rest = segments.slice(1).join('/');
        return rest ? `/${rest}` : '/';
    }
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

/**
 * Formats a path for a target locale.
 * e.g. resolveLocalizedPath('/archives', 'en') -> '/en/archives'
 *      resolveLocalizedPath('/archives', 'zh-CN') -> '/archives'
 *      resolveLocalizedPath('/#posts', 'ja') -> '/ja/#posts'
 *      resolveLocalizedPath('/', 'en') -> '/en/'
 */
export function resolveLocalizedPath(path: string, locale: Locale): string {
    // Leave external links, mailto, tel untouched
    if (/^(?:[a-z]+:|\/\/)/i.test(path)) {
        return path;
    }

    const [pathPart, ...restParts] = path.split(/(?=[?#])/);
    const suffix = restParts.join('');
    const barePath = stripLocalePrefix(pathPart);

    if (locale === i18nConfig.defaultLocale) {
        return `${barePath}${suffix}`;
    }

    const normalizedBare = barePath === '/' ? '' : barePath;
    return `/${locale}${normalizedBare || '/'}${suffix}`;
}

/**
 * Converts a current URL pathname to the equivalent path in a target locale,
 * preserving any query parameters and hashes.
 */
export function switchLocalePath(currentPathname: string, targetLocale: Locale): string {
    return resolveLocalizedPath(currentPathname, targetLocale);
}

/**
 * Generates absolute localized URLs for alternate link tags.
 *
 * `locales` defaults to every configured locale, which is right for pages that are
 * genuinely localized (listings, taxonomies). Article pages pass the narrower set of
 * locales the post has real content for, so an untranslated fallback copy is never
 * advertised to search engines as a translation.
 */
export function getAlternateLocaleUrls(
    pathname: string,
    siteUrl: string | URL,
    locales: readonly Locale[] = i18nConfig.locales
): Array<{ locale: Locale; href: string }> {
    const base = typeof siteUrl === 'string' ? new URL(siteUrl) : siteUrl;
    return locales.map((locale) => {
        const localizedPath = resolveLocalizedPath(pathname, locale);
        return {
            locale,
            href: new URL(localizedPath, base).toString()
        };
    });
}
