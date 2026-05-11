import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
    site: 'https://www.wakusei.top',
    integrations: [svelte()],
    output: 'static',
    outDir: './dist',
    devToolbar: {
        enabled: false
    }
});
