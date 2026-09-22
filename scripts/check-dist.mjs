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
    '_headers'
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

for (const slug of draftSlugs) {
    const route = path.join(dist, 'posts', slug);
    if (existsSync(route)) failures.push(`Draft route was generated: ${relative(route)}`);
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

if (failures.length > 0) {
    console.error('Static release checks failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Static release checks passed (${files.length} generated files inspected).`);
}
