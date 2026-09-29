import './_pinia-guard';
import type { App } from 'vue';
import { createPinia } from 'pinia';

const pinia = createPinia();

// Keep this entry lean: it runs for every island on every page. Heavy plugins
// such as vue-virtual-scroller are imported by the one component that uses them.
export default (app: App) => {
    app.use(pinia);
};
