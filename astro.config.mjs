import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
    site: 'https://www.wakusei.top',
    integrations: [
        vue({
            appEntrypoint: '/src/pages/_app',
            devtools: false
        })
    ],
    output: 'static',
    outDir: './dist',
    devToolbar: {
        enabled: false
    }
});
