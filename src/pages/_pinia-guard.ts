if (typeof (globalThis as unknown as { __VUE_PROD_DEVTOOLS__?: unknown }).__VUE_PROD_DEVTOOLS__ === 'undefined') {
    (globalThis as unknown as { __VUE_PROD_DEVTOOLS__: unknown }).__VUE_PROD_DEVTOOLS__ = false;
}

type VueHmrRuntime = {
    createRecord: (id: string, component: object) => boolean;
    rerender: (id: string, render?: unknown) => void;
    reload: (id: string, component: object) => void;
    CHANGED_FILE: string | null;
};

const hmrGlobal = globalThis as typeof globalThis & {
    __VUE_HMR_RUNTIME__?: VueHmrRuntime;
};

// The pinned `vue.runtime.esm-bundler` build omits Vue's dev HMR runtime.
// Keep the compiler's calls inert until that runtime is actually present.
if (!hmrGlobal.__VUE_HMR_RUNTIME__) {
    hmrGlobal.__VUE_HMR_RUNTIME__ = {
        createRecord: () => false,
        rerender: () => undefined,
        reload: () => undefined,
        CHANGED_FILE: null
    };
}
