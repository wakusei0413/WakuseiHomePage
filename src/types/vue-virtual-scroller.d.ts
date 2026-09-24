import type { DynamicScroller, DynamicScrollerItem, RecycleScroller, WindowScroller } from 'vue-virtual-scroller';

declare module '@vue/runtime-core' {
    export interface GlobalComponents {
        RecycleScroller: typeof RecycleScroller;
        DynamicScroller: typeof DynamicScroller;
        DynamicScrollerItem: typeof DynamicScrollerItem;
        WindowScroller: typeof WindowScroller;
    }
}

export {};
