import './_pinia-guard';
import type { App } from 'vue';
import { createPinia } from 'pinia';
import VueVirtualScroller from 'vue-virtual-scroller';

const pinia = createPinia();

export default (app: App) => {
    app.use(pinia);
    app.use(VueVirtualScroller);
};
