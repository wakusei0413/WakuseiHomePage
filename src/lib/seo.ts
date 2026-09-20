import type { PostAuthor } from './post-model';

export interface ArticleSeoMetadata {
    publishedTime: string;
    modifiedTime: string;
    author: PostAuthor;
    image?: string;
    language: string;
    section?: string;
    tags?: string[];
}

export interface ArticleSeoInput extends Omit<ArticleSeoMetadata, 'author' | 'modifiedTime'> {
    author?: PostAuthor;
    fallbackAuthor: PostAuthor;
    updatedTime?: string;
}

export interface BlogPostingInput extends ArticleSeoMetadata {
    canonicalUrl: string;
    description: string;
    headline: string;
    publisher: PostAuthor & { image?: string };
}

export interface BlogPostingJsonLd {
    '@context': 'https://schema.org';
    '@type': 'BlogPosting';
    mainEntityOfPage: {
        '@type': 'WebPage';
        '@id': string;
    };
    headline: string;
    description: string;
    url: string;
    datePublished: string;
    dateModified: string;
    author: JsonLdPerson;
    publisher: JsonLdPerson;
    inLanguage: string;
    image?: string;
    articleSection?: string;
    keywords?: string[];
}

interface JsonLdPerson {
    '@type': 'Person';
    name: string;
    url?: string;
    image?: string;
}

function nonBlank(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function toJsonLdPerson(person: PostAuthor & { image?: string }): JsonLdPerson {
    const url = nonBlank(person.url);
    const image = nonBlank(person.image);

    return {
        '@type': 'Person',
        name: person.name,
        ...(url ? { url } : {}),
        ...(image ? { image } : {})
    };
}

export function resolveArticleAuthor(author: PostAuthor | undefined, fallback: PostAuthor): PostAuthor {
    return { ...(author ?? fallback) };
}

export function createArticleSeoMetadata(input: ArticleSeoInput): ArticleSeoMetadata {
    return {
        publishedTime: input.publishedTime,
        modifiedTime: input.updatedTime ?? input.publishedTime,
        author: resolveArticleAuthor(input.author, input.fallbackAuthor),
        image: input.image,
        language: input.language,
        section: input.section,
        tags: input.tags
    };
}

export function createBlogPostingJsonLd(input: BlogPostingInput): BlogPostingJsonLd {
    const image = nonBlank(input.image);
    const section = nonBlank(input.section);
    const keywords = input.tags?.map((tag) => tag.trim()).filter(Boolean);

    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': input.canonicalUrl
        },
        headline: input.headline,
        description: input.description,
        url: input.canonicalUrl,
        datePublished: input.publishedTime,
        dateModified: input.modifiedTime,
        author: toJsonLdPerson(input.author),
        publisher: toJsonLdPerson(input.publisher),
        inLanguage: input.language,
        ...(image ? { image } : {}),
        ...(section ? { articleSection: section } : {}),
        ...(keywords?.length ? { keywords } : {})
    };
}

export function serializeJsonLd(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
