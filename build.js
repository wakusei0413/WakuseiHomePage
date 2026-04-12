/**
 * 构建脚本 — 压缩 JS 和 CSS 到 dist/ 目录
 * 用法：node build.js
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');

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

    // Copy static assets
    copyDir(path.join(__dirname, 'res'), path.join(DIST, 'res'));
    copyDir(path.join(__dirname, 'css'), path.join(DIST, 'css'));
    copyDir(path.join(__dirname, 'js'), path.join(DIST, 'js'));
    fs.copyFileSync(path.join(__dirname, 'config.js'), path.join(DIST, 'config.js'));
    fs.copyFileSync(path.join(__dirname, 'LICENSE'), path.join(DIST, 'LICENSE'));

    // Minify JS
    try {
        const { minify } = require('terser');
        const jsDir = path.join(DIST, 'js');
        const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));

        for (const file of jsFiles) {
            const filePath = path.join(jsDir, file);
            const code = fs.readFileSync(filePath, 'utf8');
            const result = await minify(code, {
                compress: { drop_console: false },
                mangle: true
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
        const cssFile = path.join(DIST, 'css', 'style.css');
        const cssCode = fs.readFileSync(cssFile, 'utf8');
        const result = await postcss([cssnano]).process(cssCode, { from: cssFile });
        fs.writeFileSync(cssFile, result.css);
        console.log('  Minified: css/style.css');
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            console.log('  postcss/cssnano not found, skipping CSS minification. Run: npm install');
        } else {
            throw e;
        }
    }

    // Process HTML — update paths for dist
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    // Minify HTML (basic: remove extra whitespace in production)
    html = html.replace(/\n\s*\n/g, '\n');
    fs.writeFileSync(path.join(DIST, 'index.html'), html);
    console.log('  Copied: index.html');

    console.log('Build complete! Output in dist/');
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
