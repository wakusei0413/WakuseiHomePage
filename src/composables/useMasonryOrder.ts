import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import {
    MASONRY_SINGLE_COLUMN_MQ,
    masonryColumnCount,
    toColumnMajorOrder
} from '../lib/masonry-order';

/**
 * Reorders a chronological list so CSS multi-column masonry reads left→right
 * per visual row. SSR defaults to 2 columns (desktop); client syncs at 768px.
 */
export function useMasonryOrder<T>(items: Ref<readonly T[]> | (() => readonly T[])) {
    // Desktop-first to match SSR + default `.post-list--masonry { columns: 2 }`.
    const columnCount = ref(2);

    const source = typeof items === 'function' ? computed(items) : computed(() => items.value);

    const orderedItems = computed(() => toColumnMajorOrder(source.value, columnCount.value));

    let mql: MediaQueryList | null = null;
    const sync = () => {
        if (!mql) return;
        columnCount.value = masonryColumnCount(mql.matches);
    };

    onMounted(() => {
        mql = window.matchMedia(MASONRY_SINGLE_COLUMN_MQ);
        sync();
        mql.addEventListener('change', sync);
    });

    onUnmounted(() => {
        mql?.removeEventListener('change', sync);
        mql = null;
    });

    return { orderedItems, columnCount };
}
