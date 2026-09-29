import { describe, expect, it } from 'vitest';
import {
    buildPostEntryId,
    groupPostTranslations,
    isSupportedLocale,
    parsePostEntryId,
    resolvePostTranslation,
    resolvePostTranslations,
    sortLocales
} from '../src/lib/post-locale';

interface Entry {
    id: string;
    language?: string;
    draft?: boolean;
}

const entry = (id: string, language?: string, draft = false): Entry => ({ id, language, draft });
const read = (item: Entry) => ({ id: item.id, language: item.language, draft: item.draft });
const group = (entries: Entry[]) => groupPostTranslations(entries, read);

describe('post entry ids', () => {
    it('reads the locale suffix a translation file carries', () => {
        expect(parsePostEntryId('hello-world')).toEqual({ slug: 'hello-world', locale: null });
        expect(parsePostEntryId('hello-world@en')).toEqual({ slug: 'hello-world', locale: 'en' });
        expect(parsePostEntryId('hello-world@zh-CN')).toEqual({ slug: 'hello-world', locale: 'zh-CN' });
    });

    it('leaves unknown suffixes as part of the slug', () => {
        expect(parsePostEntryId('hello@world')).toEqual({ slug: 'hello@world', locale: null });
        expect(parsePostEntryId('@en')).toEqual({ slug: '@en', locale: null });
    });

    it('normalizes windows separators', () => {
        expect(parsePostEntryId('nested\\post@ja').slug).toBe('nested/post');
    });

    it('round-trips through buildPostEntryId', () => {
        expect(buildPostEntryId('hello-world', null)).toBe('hello-world');
        expect(buildPostEntryId('hello-world', 'ja')).toBe('hello-world@ja');
        expect(parsePostEntryId(buildPostEntryId('hello-world', 'en'))).toEqual({
            slug: 'hello-world',
            locale: 'en'
        });
    });

    it('recognises only configured locales', () => {
        expect(isSupportedLocale('en')).toBe(true);
        expect(isSupportedLocale('fr')).toBe(false);
        expect(sortLocales(['ja', 'zh-CN'])).toEqual(['zh-CN', 'ja']);
    });
});

describe('grouping translations', () => {
    it('collects a source article with its translations', () => {
        const [post] = group([entry('a'), entry('a@en'), entry('a@ja')]);

        expect(post.slug).toBe('a');
        expect(post.sourceLocale).toBe('zh-CN');
        expect(post.source.id).toBe('a');
        expect(post.availableLocales).toEqual(['zh-CN', 'en', 'ja']);
    });

    it('honours the source article declared language', () => {
        const [post] = group([entry('a', 'en'), entry('a@ja')]);

        expect(post.sourceLocale).toBe('en');
        expect(post.availableLocales).toEqual(['en', 'ja']);
    });

    it('never lists the source locale twice', () => {
        const [post] = group([entry('a', 'en'), entry('a@en')]);

        expect(post.availableLocales).toEqual(['en']);
        expect(post.translations.size).toBe(0);
    });

    it('unpublishes every language when the source article is a draft', () => {
        expect(group([entry('a', undefined, true), entry('a@en')])).toHaveLength(0);
    });

    it('skips a drafted translation without unpublishing the post', () => {
        const [post] = group([entry('a'), entry('a@en', undefined, true)]);

        expect(post.availableLocales).toEqual(['zh-CN']);
    });

    it('accepts a post shipped as a translation only', () => {
        const [post] = group([entry('a@ja')]);

        expect(post.sourceLocale).toBe('ja');
        expect(post.source.id).toBe('a@ja');
        expect(post.availableLocales).toEqual(['ja']);
    });
});

describe('resolving a locale', () => {
    it('serves the translation when one exists', () => {
        const [post] = group([entry('a'), entry('a@en')]);
        const resolved = resolvePostTranslation(post, 'en');

        expect(resolved.entry.id).toBe('a@en');
        expect(resolved.contentLocale).toBe('en');
        expect(resolved.translated).toBe(true);
    });

    it('falls back to the source article and reports its real language', () => {
        const [post] = group([entry('a'), entry('a@en')]);
        const resolved = resolvePostTranslation(post, 'ja');

        expect(resolved.entry.id).toBe('a');
        expect(resolved.requestedLocale).toBe('ja');
        expect(resolved.contentLocale).toBe('zh-CN');
        expect(resolved.translated).toBe(false);
        // The untranslated route must not advertise itself as Japanese content.
        expect(resolved.availableLocales).not.toContain('ja');
    });

    it('serves the source article on its own locale', () => {
        const [post] = group([entry('a', 'en'), entry('a@ja')]);
        const resolved = resolvePostTranslation(post, 'en');

        expect(resolved.entry.id).toBe('a');
        expect(resolved.contentLocale).toBe('en');
        expect(resolved.translated).toBe(true);
    });

    it('resolves every post for a locale, keeping group order', () => {
        const groups = group([entry('a'), entry('a@ja'), entry('b'), entry('c'), entry('c@ja')]);
        const resolved = resolvePostTranslations(groups, 'ja');

        expect(resolved.map((item) => item.slug)).toEqual(['a', 'b', 'c']);
        expect(resolved.map((item) => item.translated)).toEqual([true, false, true]);
    });
});
