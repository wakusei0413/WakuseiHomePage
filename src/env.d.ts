/// <reference types="astro/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
    export default component;
}

declare module 'virtual:astro:vue-app' {
    import type { App } from 'vue';
    export function setup(app: App): void | Promise<void>;
}
