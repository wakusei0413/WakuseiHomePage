import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.svelte'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');

describe('loading overlay navigation behavior', () => {
    it('renders the loading overlay from the global layout', () => {
        assert.match(baseLayout, /<div id="globalLoadingOverlay" class="loading-overlay">/);
        assert.match(baseLayout, /<div id="globalLoadingText" class="loading-text">/);
        assert.match(baseLayout, /<div id="globalLoadingBar" class="loading-bar"/);
        assert.match(baseLayout, /<div id="globalLoadingPercent" class="loading-percent">0%<\/div>/);
    });

    it('skips the loader only for the next internal Astro swap', () => {
        assert.match(
            baseLayout,
            /var skipEntryLoader = sessionStorage\.getItem\('__wakusei_skip_entry_loader'\) === 'true';/
        );
        assert.match(baseLayout, /if \(skipEntryLoader\) \{/);
        assert.match(baseLayout, /overlay\.classList\.add\('hidden'\);/);
        assert.match(baseLayout, /sessionStorage\.removeItem\('__wakusei_skip_entry_loader'\);/);
    });

    it('pre-hides incoming loaders during internal Astro swaps', () => {
        assert.match(baseLayout, /document\.addEventListener\('astro:before-swap', \(event\) => \{/);
        assert.match(baseLayout, /event\.newDocument\.querySelector\('#globalLoadingOverlay'\)/);
        assert.match(baseLayout, /incomingOverlay\.classList\.add\('hidden'\)/);
        assert.match(baseLayout, /sessionStorage\.setItem\('__wakusei_skip_entry_loader', 'true'\);/);
    });

    it('keeps the homepage component free of loading overlay ownership', () => {
        assert.doesNotMatch(homepageApp, /LoadingOverlay/);
        assert.doesNotMatch(homepageApp, /loadingPercent/);
        assert.doesNotMatch(homepageApp, /loadingText/);
    });

    it('waits for homepage readiness before hiding direct homepage entry loads', () => {
        assert.match(baseLayout, /window\.addEventListener\('wakusei:homepage-ready'/);
        assert.match(baseLayout, /document\.querySelector\('\.page-scroller'\)/);
        assert.match(homepageApp, /window\.dispatchEvent\(new CustomEvent\('wakusei:homepage-ready'\)\)/);
    });

    it('does not keep the legacy homepage blur reveal after the global loader is skipped', () => {
        assert.doesNotMatch(layoutCss, /filter:\s*blur\(30px\)/);
        assert.doesNotMatch(layoutCss, /filter\s+0\.5s\s+ease-out/);
        assert.match(layoutCss, /\.container\s*\{[\s\S]*?filter:\s*none;/);
        assert.doesNotMatch(baseLayout, /__wakusei_skip_homepage_reveal/);
        assert.doesNotMatch(homepageApp, /__wakusei_skip_homepage_reveal/);
    });
});
