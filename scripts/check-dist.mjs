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
    'opus-5-5-review-domestic-models-on-the-edge',
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
    const hero = images.find((image) => image.includes('post-hero-image'));
    if (!hero || (hero.match(/\bsrcset="([^"]+)"/)?.[1].match(/\b\d+w\b/g)?.length ?? 0) < 2) {
        failures.push(`Expected the article hero cover to offer a srcset: ${relative(imagePost)}`);
    }
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
    if (extension === '.html' && /fonts\.(?:googleapis|gstatic)\.com/.test(source)) {
        failures.push(`Google Fonts (unreachable from mainland China) referenced in ${relative(file)}`);
    }
    const isLayoutPage = extension === '.html' && path.basename(file) !== 'unsupported.html';
    if (isLayoutPage && source.includes('<html') && !source.includes("'data-perf'")) {
        failures.push(`Missing the lite-mode boot script in ${relative(file)}`);
    }
}

// ----- Payload guardrails for slow networks and low-end devices -----

// Total client JavaScript, uncompressed. Raise deliberately, never by accident.
const JS_BUDGET_BYTES = 400_000;
const astroScripts = files.filter(
    (file) => path.extname(file) === '.js' && file.includes(`${path.sep}_astro${path.sep}`)
);

// Prebuilt third-party widgets that article pages fetch on demand. Each ships its
// own framework copy (Twikoo bundles a private Vue app), so they are kept out of
// the site budget and the Vue singleton check, but capped separately and must
// never be loaded by a static import.
const LAZY_VENDOR_CHUNKS = [{ name: 'Twikoo', pattern: /^twikoo\.min\.[\w-]+\.js$/, budget: 400_000 }];
const lazyVendorFiles = new Set();
for (const vendor of LAZY_VENDOR_CHUNKS) {
    for (const file of astroScripts.filter((candidate) => vendor.pattern.test(path.basename(candidate)))) {
        lazyVendorFiles.add(file);
        const size = statSync(file).size;
        if (size > vendor.budget) {
            failures.push(`${vendor.name} chunk is ${size} bytes, over its ${vendor.budget}-byte budget`);
        }
        // A static `import ... from "./twikoo.min.x.js"` (or bare `import "./..."`) would
        // pull the widget into every page; only `import("./twikoo.min.x.js")` is allowed.
        const escapedName = path.basename(file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const staticImport = new RegExp(String.raw`(?:from\s*|\bimport\s*)["'\x60][^"'\x60]*` + escapedName);
        for (const importer of astroScripts.filter((other) => other !== file)) {
            if (staticImport.test(readFileSync(importer, 'utf8'))) {
                failures.push(`${vendor.name} is statically imported by ${relative(importer)}; load it with import()`);
            }
        }
    }
}
const clientScripts = astroScripts.filter((file) => !lazyVendorFiles.has(file));
const clientScriptBytes = clientScripts.reduce((total, file) => total + statSync(file).size, 0);
if (clientScriptBytes > JS_BUDGET_BYTES) {
    failures.push(`Client JS is ${clientScriptBytes} bytes, over the ${JS_BUDGET_BYTES}-byte budget`);
}
for (const file of clientScripts) {
    const source = readFileSync(file, 'utf8');
    if (source.includes('ZodError')) {
        failures.push(`zod leaked into a client bundle (validate config server-side only): ${relative(file)}`);
    }
    if (path.basename(file).startsWith('_app.') && source.includes('DynamicScroller')) {
        failures.push(`vue-virtual-scroller is bundled into the per-island app entry: ${relative(file)}`);
    }
}
if (!files.some((file) => /inter.*\.woff2$/i.test(path.basename(file)))) {
    failures.push('Expected the self-hosted Inter woff2 in dist/_astro');
}
const headersFile = path.join(dist, '_headers');
if (
    existsSync(headersFile) &&
    !/^\/_astro\/\*\s*$\s*Cache-Control:[^\n]*immutable/m.test(readFileSync(headersFile, 'utf8'))
) {
    failures.push('Expected dist/_headers to cache /_astro/* as immutable');
}

const vueRuntimeFiles = files.filter((file) => {
    if (path.extname(file) !== '.js' || lazyVendorFiles.has(file)) return false;
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
