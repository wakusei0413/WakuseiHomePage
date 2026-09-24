import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const requiredFiles = [
    'index.html',
    '404.html',
    'archives/index.html',
    'search/index.html',
    'rss.xml',
    'atom.xml',
    'search-index.json',
    'featured-posts.json',
    'og-default.jpg',
    'sitemap-index.xml',
    '_headers',
    'unsupported.html'
];
const draftSlugs = ['app-filing-and-internet-control', 'huaxue', 'test-draft'];
const publicTextExtensions = new Set(['.html', '.json', '.xml']);
const failures = [];

function relative(file) {
    return path.relative(root, file).replaceAll('\\', '/');
}

function walk(directory) {
    return readdirSync(directory).flatMap((name) => {
        const file = path.join(directory, name);
        return statSync(file).isDirectory() ? walk(file) : [file];
    });
}

function requireFile(file) {
    const absolute = path.join(dist, file);
    if (!existsSync(absolute)) {
        failures.push(`Missing required output: dist/${file}`);
        return;
    }
    if (statSync(absolute).size === 0) failures.push(`Empty required output: dist/${file}`);
}

if (!existsSync(dist)) {
    throw new Error('dist/ does not exist. Run npm run build first.');
}

for (const file of requiredFiles) requireFile(file);

for (const file of ['search-index.json', 'featured-posts.json']) {
    const absolute = path.join(dist, file);
    if (!existsSync(absolute)) continue;
    try {
        const value = JSON.parse(readFileSync(absolute, 'utf8'));
        if (!Array.isArray(value)) failures.push(`Expected dist/${file} to contain a JSON array`);
    } catch (error) {
        failures.push(`Invalid JSON in dist/${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

for (const file of ['rss.xml', 'atom.xml', 'sitemap-index.xml']) {
    const absolute = path.join(dist, file);
    if (!existsSync(absolute)) continue;
    const source = readFileSync(absolute, 'utf8').trim();
    if (!source.startsWith('<?xml')) failures.push(`Expected dist/${file} to start with an XML declaration`);
}

const publishedFeedSlugs = [
    'android-12-quick-hands-on-compromise',
    'autocrats-roll-back-rights-and-rule-of-law',
    'enable-xiaoai-custom-unsupported-devices',
    'genshin-cn-to-global-transfer',
    'jlpt-n1-n5-certification-standards',
    'miui13-lmi-flash-packages-before-spring-festival',
    'n5-grammar-easy-system',
    'some-random-talks-about-2022',
    'trump-tariff-plan-report',
    'whataboutblog01',
    'why-not-recommend-miui-beginners-custom-roms'
];

function checkFeed(file, itemTag, contentMarker) {
    const absolute = path.join(dist, file);
    if (!existsSync(absolute)) return;
    const source = readFileSync(absolute, 'utf8');
    const items = source.match(new RegExp(`<${itemTag}>`, 'g'))?.length ?? 0;
    const contents = source.match(new RegExp(contentMarker, 'g'))?.length ?? 0;
    if (items !== publishedFeedSlugs.length) {
        failures.push(`Expected dist/${file} to contain ${publishedFeedSlugs.length} ${itemTag}s, found ${items}`);
    }
    if (contents !== items) {
        failures.push(`Expected every dist/${file} ${itemTag} to include full article HTML`);
    }
    if (!source.includes('一行代码没敲')) {
        failures.push(`Expected dist/${file} to include the full body of whataboutblog01`);
    }
    if (source.includes('src="/_astro/') || source.includes('src=&quot;/_astro/')) {
        failures.push(`Expected dist/${file} image URLs to be absolute`);
    }
    for (const slug of publishedFeedSlugs) {
        if (!source.includes(`/posts/${slug}`)) failures.push(`Expected dist/${file} to include /posts/${slug}`);
    }
}

checkFeed('rss.xml', 'item', '<content:encoded>');
checkFeed('atom.xml', 'entry', '<content type="html">');

for (const slug of draftSlugs) {
    const route = path.join(dist, 'posts', slug);
    if (existsSync(route)) failures.push(`Draft route was generated: ${relative(route)}`);
}

const imagePost = path.join(dist, 'posts/genshin-cn-to-global-transfer/index.html');
if (!existsSync(imagePost)) {
    failures.push(`Missing image sample page: ${relative(imagePost)}`);
} else {
    const images = readFileSync(imagePost, 'utf8').match(/<img\b[^>]*>/gi) ?? [];
    const hasResponsiveBodyImage = images.some((image) => {
        const srcset = image.match(/\bsrcset="([^"]+)"/)?.[1] ?? '';
        return (
            image.includes('data-astro-image="constrained"') &&
            /\bsizes="[^"]+"/.test(image) &&
            (srcset.match(/\b\d+w\b/g)?.length ?? 0) >= 2
        );
    });
    if (!hasResponsiveBodyImage) failures.push(`Missing responsive body image: ${relative(imagePost)}`);
}

const files = walk(dist);
for (const file of files) {
    const extension = path.extname(file);
    if (!publicTextExtensions.has(extension)) continue;
    const source = readFileSync(file, 'utf8');
    for (const slug of draftSlugs) {
        if (source.includes(slug)) failures.push(`Draft slug "${slug}" leaked into ${relative(file)}`);
    }
    if (extension === '.html' && /<script(?![^>]*\bdata-cfasync=(?:"false"|'false'))/i.test(source)) {
        failures.push(`Script without data-cfasync="false" in ${relative(file)}`);
    }
}

const vueRuntimeFiles = files.filter((file) => {
    if (path.extname(file) !== '.js') return false;
    return readFileSync(file, 'utf8').includes('__VUE_INSTANCE_SETTERS__');
});
if (vueRuntimeFiles.length > 1) {
    failures.push(`Vue runtime marker appears in multiple bundles: ${vueRuntimeFiles.map(relative).join(', ')}`);
}

const homePage = path.join(dist, 'index.html');
if (existsSync(homePage)) {
    const home = readFileSync(homePage, 'utf8');
    if (!home.includes('document.documentMode')) {
        failures.push('Expected dist/index.html to sniff document.documentMode');
    }
    if (!home.includes('/unsupported.html')) {
        failures.push('Expected dist/index.html to point old browsers at /unsupported.html');
    }
    if (!home.includes('[if lte IE 9]')) {
        failures.push('Expected dist/index.html to keep the IE conditional comment');
    }
}

const unsupportedPage = path.join(dist, 'unsupported.html');
if (existsSync(unsupportedPage)) {
    const unsupported = readFileSync(unsupportedPage, 'utf8');
    if (!unsupported.includes('href="/rss.xml"')) {
        failures.push('Expected dist/unsupported.html to link to /rss.xml');
    }
    if (!unsupported.includes("window.location.replace('/')")) {
        failures.push('Expected dist/unsupported.html to return capable browsers home');
    }
    if (unsupported.includes("window.location.replace('/unsupported.html')")) {
        failures.push('Expected dist/unsupported.html not to redirect old browsers again');
    }
    if (/type=["']module["']/i.test(unsupported)) {
        failures.push('Expected dist/unsupported.html to avoid module scripts');
    }
}

if (failures.length > 0) {
    console.error('Static release checks failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Static release checks passed (${files.length} generated files inspected).`);
}
