import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const baseLayout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
const unsupported = readFileSync('public/unsupported.html', 'utf8');

describe('unsupported browser fallback', () => {
    it('redirects old browsers with an ES3 inline script before the client router', () => {
        const sniff = baseLayout.match(/<script\b([^>]*)>([\s\S]*?document\.documentMode[\s\S]*?)<\/script>/);
        expect(sniff).not.toBeNull();

        const attrs = sniff?.[1] ?? '';
        const body = sniff?.[2] ?? '';
        expect(attrs).toContain('is:inline');
        expect(attrs).not.toMatch(/\basync\b/);
        expect(attrs).not.toMatch(/\bdefer\b/);
        expect(attrs).not.toContain('type="module"');
        expect(body).toContain('!window.CSS');
        expect(body).toContain("window.CSS.supports('color', 'var(--x)')");
        expect(body).toContain("window.location.replace('/unsupported.html')");
        expect(body).not.toMatch(/\b(?:const|let)\b|=>/);

        const sniffAt = baseLayout.indexOf('document.documentMode');
        const routerAt = baseLayout.indexOf('<ClientRouter />');
        expect(sniffAt).toBeGreaterThanOrEqual(0);
        expect(routerAt).toBeGreaterThan(sniffAt);
        expect(baseLayout).toContain('<!--[if lte IE 9]>');
        expect(baseLayout).toContain('url=/unsupported.html');
        expect(baseLayout).not.toContain('navigator.userAgent');
    });

    it('returns capable browsers home and still offers RSS plus browser downloads', () => {
        const style = unsupported.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
        const sniff = unsupported.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/);
        expect(sniff).not.toBeNull();

        const attrs = sniff?.[1] ?? '';
        const body = sniff?.[2] ?? '';
        expect(attrs).toContain('data-cfasync="false"');
        expect(attrs).not.toMatch(/\basync\b/);
        expect(attrs).not.toMatch(/\bdefer\b/);
        expect(attrs).not.toContain('type="module"');
        expect(body).toContain('!document.documentMode');
        expect(body).toContain("window.CSS.supports('color', 'var(--x)')");
        expect(body).toContain("window.location.replace('/')");
        expect(body).not.toContain('/unsupported.html');
        expect(body).not.toMatch(/\b(?:const|let)\b|=>/);

        expect(unsupported).toContain('href="/rss.xml"');
        expect(unsupported).toContain('订阅 RSS');
        expect(unsupported).toContain('href="https://www.google.com/intl/zh-CN/chrome/"');
        expect(unsupported).toContain('href="https://www.microsoft.com/zh-cn/edge/download"');
        expect(unsupported).toContain('href="https://www.mozilla.org/zh-CN/firefox/new/"');
        expect(unsupported).not.toContain('border: 4px');
        expect(unsupported).toContain('type="application/rss+xml"');
        expect(unsupported).toContain('type="application/atom+xml"');
        expect(unsupported).toContain('noindex');
        expect(style).not.toContain('var(--');
    });
});
