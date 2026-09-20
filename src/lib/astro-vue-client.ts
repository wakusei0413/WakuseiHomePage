import { createApp, createSSRApp, defineComponent, h, Suspense } from 'vue';
import { setup } from 'virtual:astro:vue-app';

// Local copy of @astrojs/vue's browser renderer. Importing Vue from the app
// graph (instead of the immutable node_modules client) keeps islands on one
// runtime instance so template refs keep their owner during ClientRouter swaps.

type VueComponent = {
    name?: string;
    setup?: (...args: unknown[]) => unknown;
};

type AppInstance = {
    props: Record<string, unknown>;
    slots: Record<string, () => unknown>;
    component?: { $forceUpdate: () => void };
};

const StaticHtml = defineComponent({
    props: {
        value: String,
        name: String,
        hydrate: {
            type: Boolean,
            default: true
        }
    },
    setup({ name, value, hydrate }: { name?: string; value?: string; hydrate: boolean }) {
        if (!value) return () => null;
        const tagName = hydrate ? 'astro-slot' : 'astro-static-slot';
        return () => h(tagName, { name, innerHTML: value });
    }
});

const appMap = new WeakMap<HTMLElement, AppInstance>();

function isAsync(fn: VueComponent['setup']) {
    const constructor = fn?.constructor;
    return constructor && constructor.name === 'AsyncFunction';
}

export default (element: HTMLElement) =>
    async (
        Component: VueComponent,
        props: Record<string, unknown>,
        slotted: Record<string, string>,
        { client }: { client: string }
    ) => {
        if (!element.hasAttribute('ssr')) return;

        const name = Component.name ? `${Component.name} Host` : undefined;
        const slots: Record<string, () => unknown> = {};
        for (const [key, value] of Object.entries(slotted)) {
            slots[key] = () => h(StaticHtml, { value, name: key === 'default' ? undefined : key });
        }

        const isHydrate = client !== 'only';
        const bootstrap = isHydrate ? createSSRApp : createApp;
        let appInstance = appMap.get(element);

        if (!appInstance) {
            appInstance = { props, slots };
            const app = bootstrap({
                name,
                render() {
                    let content = h(Component as never, appInstance?.props, appInstance?.slots);
                    appInstance!.component = this;
                    if (isAsync(Component.setup)) {
                        content = h(Suspense, null, content);
                    }
                    return content;
                }
            });
            app.config.idPrefix = element.getAttribute('prefix') ?? undefined;
            await setup(app);
            app.mount(element, isHydrate);
            appMap.set(element, appInstance);
            element.addEventListener('astro:unmount', () => app.unmount(), { once: true });
        } else {
            appInstance.props = props;
            appInstance.slots = slots;
            appInstance.component?.$forceUpdate();
        }
    };
