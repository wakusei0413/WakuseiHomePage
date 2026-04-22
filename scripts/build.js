/**
 * 构建脚本 — 压缩 JS 和 CSS 到 dist/ 目录
 * 用法：node build.js
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function clearDir(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            clearDir(entryPath);
            fs.rmdirSync(entryPath);
        } else {
            fs.unlinkSync(entryPath);
        }
    }
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyDir(src, dest) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function build() {
    console.log('Building WakuseiHomePage...');

    ensureDir(DIST);
    clearDir(DIST);

    // Copy static assets
    copyDir(path.join(ROOT, 'res'), path.join(DIST, 'res'));
    copyDir(path.join(ROOT, 'css'), path.join(DIST, 'css'));
    copyDir(path.join(ROOT, 'js'), path.join(DIST, 'js'));
    fs.copyFileSync(path.join(ROOT, 'config.js'), path.join(DIST, 'config.js'));
    fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(DIST, 'LICENSE'));

    // Sync config.js → legacy.js (keep legacy fallback in sync automatically)
    const configModule = await import(pathToFileURL(path.join(ROOT, 'config.js')).href);
    const CONFIG = configModule.CONFIG;

    const legacyConfig = {
        version: CONFIG.version,
        profile: CONFIG.profile,
        socialLinks: CONFIG.socialLinks,
        footer: CONFIG.footer,
        debug: CONFIG.debug
    };

    const legacyPath = path.join(DIST, 'js', 'legacy.js');
    let legacyCode = fs.readFileSync(legacyPath, 'utf8');
    const replacement = 'var CONFIG = ' + JSON.stringify(legacyConfig, null, 4) + ';';
    legacyCode = legacyCode.replace(
        /var CONFIG = \{[\s\S]*?\};\s*(?=\/\/ ===== 最小 Polyfills)/,
        replacement + '\n\n'
    );
    fs.writeFileSync(legacyPath, legacyCode);
    console.log('  Synced: config.js → js/legacy.js');

    // Minify JS
    try {
        const { minify } = require('terser');
        const jsDir = path.join(DIST, 'js');
        const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));

        for (const file of jsFiles) {
            const filePath = path.join(jsDir, file);
            const code = fs.readFileSync(filePath, 'utf8');
            const result = await minify(code, {
                compress: { drop_console: true },
                mangle: true,
                module: true
            });
            fs.writeFileSync(filePath, result.code);
            console.log(`  Minified: js/${file}`);
        }

        const configFile = path.join(DIST, 'config.js');
        const configCode = fs.readFileSync(configFile, 'utf8');
        const configResult = await minify(configCode, { mangle: false });
        fs.writeFileSync(configFile, configResult.code);
        console.log('  Minified: config.js');
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            console.log('  terser not found, skipping JS minification. Run: npm install');
        } else {
            throw e;
        }
    }

    // Minify CSS
    try {
        const postcss = require('postcss');
        const cssnano = require('cssnano');
        const cssDir = path.join(DIST, 'css');
        const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));

        for (const file of cssFiles) {
            const cssFile = path.join(cssDir, file);
            const cssCode = fs.readFileSync(cssFile, 'utf8');
            const result = await postcss([cssnano]).process(cssCode, { from: cssFile });
            fs.writeFileSync(cssFile, result.css);
            console.log(`  Minified: css/${file}`);
        }
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            console.log('  postcss/cssnano not found, skipping CSS minification. Run: npm install');
        } else {
            throw e;
        }
    }

    // Process HTML — update paths for dist
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    // Minify HTML (basic: remove extra whitespace in production)
    html = html.replace(/\n\s*\n/g, '\n');
    if (!html.includes('type="module"')) {
        console.warn('  Warning: index.html does not contain type="module" script tag');
    }
    fs.writeFileSync(path.join(DIST, 'index.html'), html);
    console.log('  Copied: index.html');

    console.log('Build complete! Output in dist/');
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
