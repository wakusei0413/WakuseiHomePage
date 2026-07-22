<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from '../composables/useI18n';
import {
    buildTocTree,
    getHeadingTitle,
    scrollToHeading,
    computeFollowScroll,
    TOC_TOP_OFFSET,
    type TocItem
} from '../lib/toc';
import Icon from './Icon.vue';

interface FlatEntry {
    item: TocItem;
    level: 2 | 3;
}

const { t } = useI18n();

const tree = ref<TocItem[]>([]);
const activeId = ref<string>('');
const panelFits = ref(false);
const bodyActive = ref(false);
const userOpened = ref(false);
const userClosed = ref(false);
// True when the centered side panel would overlap the site footer, so the TOC
// auto-collapses into its capsule form just before colliding with it.
const panelNearFooter = ref(false);
// Integer reading progress shown in the capsule. Keeping this quantized avoids
// rerendering the whole TOC on every fractional scroll tick.
const progressPct = ref(0);
// Scroll-driven accordion: h3 children stay collapsed by default and only the
// section the reader is currently in auto-expands (see activeSectionId). This
// map holds temporary manual overrides set by clicking a chevron — h2 id ->
// forced open(true)/closed(false). Overrides are intentionally not persisted
// and reset whenever the active section changes, so the TOC always returns to
// automatic control after the reader scrolls on.
const manualOverrides = ref<Map<string, boolean>>(new Map());

// The capsule stays visible on article pages at all scroll positions. When the
// article header has scrolled out of view AND there is room for a non-intrusive
// side panel, the TOC auto-expands into that panel. On narrower viewports the
// capsule remains and opens a drawer on click.
const autoExpanded = computed(() => bodyActive.value && panelFits.value && !userClosed.value && !panelNearFooter.value);
const expanded = computed(() => autoExpanded.value || userOpened.value);
const showFixedPanel = computed(() => expanded.value && panelFits.value && !panelNearFooter.value);
const showDrawer = computed(() => expanded.value && (!panelFits.value || panelNearFooter.value));
const showCapsule = computed(() => !showFixedPanel.value && !showDrawer.value);

let headingObserver: IntersectionObserver | null = null;
let scrollCleanup: (() => void) | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let headingElements: HTMLElement[] = [];
let scrollerElement: HTMLElement | null = null;
let bodyElement: HTMLElement | null = null;
let footerElement: HTMLElement | null = null;
let scrollFrame: number | null = null;
// Cached height of the expanded side panel; used to estimate its bottom edge on
// frames where the panel is unmounted (capsule form) so we can still predict a
// footer collision.
let lastPanelHeight = 0;
const visibleSet = new Set<string>();

const PANEL_MIN_WIDTH = 220;
const PANEL_MAX_WIDTH = 360;
const PANEL_GAP = 30;
const PANEL_RIGHT_MARGIN = 10;
// Gap kept between the bottom of the centered side panel and the top of the
// site footer before the TOC collapses into its capsule form.
const FOOTER_COLLISION_MARGIN = 16;

function buildFlatEntries(): FlatEntry[] {
    const out: FlatEntry[] = [];
    tree.value.forEach((h2) => {
        out.push({ item: h2, level: 2 });
        h2.children.forEach((h3) => out.push({ item: h3, level: 3 }));
    });
    return out;
}

const flatEntries = computed<FlatEntry[]>(buildFlatEntries);
const entryById = computed<Record<string, FlatEntry>>(() => {
    const map: Record<string, FlatEntry> = {};
    flatEntries.value.forEach((entry) => (map[entry.item.id] = entry));
    return map;
});

// h3 id -> owning h2 id, and h2 id -> child count, both derived from the tree.
const parentOf = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    tree.value.forEach((h2) => h2.children.forEach((c) => (map[c.id] = h2.id)));
    return map;
});
const childrenCount = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    tree.value.forEach((h2) => (map[h2.id] = h2.children.length));
    return map;
});

// The h2 section the reader is currently inside: the active h2 itself, or the
// h2 that owns the active h3. This is the section the accordion auto-expands.
const activeSectionId = computed<string>(() => {
    const id = activeId.value;
    if (!id) return '';
    const entry = entryById.value[id];
    if (!entry) return '';
    return entry.level === 2 ? id : (parentOf.value[id] ?? '');
});

// A section is open when the reader is inside it (auto), unless the reader has
// set a temporary manual override by clicking the chevron. Overrides are reset
// whenever the active section changes, so control returns to automatic.
function isSectionOpen(h2Id: string): boolean {
    const override = manualOverrides.value.get(h2Id);
    if (override !== undefined) return override;
    return h2Id === activeSectionId.value;
}

const activeTitle = computed(() => {
    const entry = entryById.value[activeId.value];
    return entry?.item.title ?? t('article.toc.empty');
});

// When the active heading is an h3, surface its parent h2 for context so the
// capsule never loses the section hierarchy. Empty for h2/empty active.
const parentTitle = computed(() => {
    const entry = entryById.value[activeId.value];
    if (!entry || entry.level !== 3) return '';
    const parent = parentOf.value[entry.item.id];
    return parent ? (entryById.value[parent]?.item.title ?? '') : '';
});

const capsuleLabel = computed(() => {
    const base = activeTitle.value;
    const p = parentTitle.value;
    const label = p ? `${p} › ${base}` : base;
    return label.length > 20 ? `${label.slice(0, 20)}…` : label;
});

// The id used to render the active highlight + emphasis. When the real active
// heading is an h3 whose parent section is collapsed (so the h3 row is hidden),
// we surface the parent h2 instead: the TOC still shows an active entry and
// auto-follow can scroll to it, without forcing a collapsed section open.
const displayActiveId = computed(() => {
    const id = activeId.value;
    if (!id) return '';
    const entry = entryById.value[id];
    if (entry && entry.level === 3) {
        const parent = parentOf.value[id];
        if (parent && !isSectionOpen(parent)) return parent;
    }
    return id;
});
const activeMarkerStyle = ref<Record<string, string>>({
    '--toc-active-marker-y': '0px',
    '--toc-active-marker-height': '0px',
    '--toc-active-marker-opacity': '0'
});

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getCurrentTocPanel(): HTMLElement | null {
    const selector = showFixedPanel.value
        ? '.article-toc__panel--fixed'
        : showDrawer.value
          ? '.article-toc__panel--drawer'
          : '.article-toc__panel';
    const panel = document.querySelector(selector);
    return panel instanceof HTMLElement ? panel : null;
}

function updateActiveMarker() {
    if (!expanded.value) {
        activeMarkerStyle.value = {
            ...activeMarkerStyle.value,
            '--toc-active-marker-opacity': '0'
        };
        return;
    }
    nextTick(() => {
        const panel = getCurrentTocPanel();
        const activeLi = panel?.querySelector('.article-toc__item--active');
        if (!(activeLi instanceof HTMLElement)) {
            activeMarkerStyle.value = {
                ...activeMarkerStyle.value,
                '--toc-active-marker-opacity': '0'
            };
            return;
        }
        activeMarkerStyle.value = {
            '--toc-active-marker-y': `${Math.round(activeLi.offsetTop)}px`,
            '--toc-active-marker-height': `${Math.round(activeLi.offsetHeight)}px`,
            '--toc-active-marker-opacity': '1'
        };
    });
}

function resolveArticleElements() {
    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    scrollerElement = scroller instanceof HTMLElement ? scroller : null;
    const body = document.querySelector('.post-body');
    bodyElement = body instanceof HTMLElement ? body : null;
    const footer = document.querySelector('.page-footer');
    footerElement = footer instanceof HTMLElement ? footer : null;
}

function scrollActiveIntoView() {
    if (!expanded.value) {
        updateActiveMarker();
        return;
    }
    nextTick(() => {
        const pane = getCurrentTocPanel();
        const activeLi = pane?.querySelector('.article-toc__item--active') as HTMLElement | null;
        if (!activeLi) return;
        // The scroll container is the panel itself. We center the active item in
        // the usable area (below the sticky header) so the TOC visibly tracks the
        // reader's position instead of only pinning the active item to the bottom
        // edge. The browser clamps scrollTop to the valid range, so the very
        // first/last items settle at the top/bottom rather than forcing blank space.
        if (!pane) return;
        const header = pane.querySelector('.article-toc__header') as HTMLElement | null;
        const headerH = header ? header.getBoundingClientRect().height : 0;
        const liRect = activeLi.getBoundingClientRect();
        const paneRect = pane.getBoundingClientRect();
        const delta = computeFollowScroll(liRect, paneRect, headerH);
        if (delta) {
            const top = Math.max(0, pane.scrollTop + delta);
            if (prefersReducedMotion()) pane.scrollTop = top;
            else pane.scrollTo({ top, behavior: 'smooth' });
        }
        updateActiveMarker();
    });
}

function updateActiveFromVisible() {
    const visibleIds = headingElements.map((h) => h.id).filter((id) => visibleSet.has(id));
    if (visibleIds.length) activeId.value = visibleIds[0];
}

function scan() {
    resolveArticleElements();
    const body = bodyElement;
    if (!body) {
        tree.value = [];
        activeId.value = '';
        return;
    }
    const raw = Array.from(body.querySelectorAll('h2[id], h3[id]')) as HTMLElement[];
    const headings = raw.map((el) => ({
        id: el.id,
        level: (el.tagName === 'H2' ? 2 : 3) as 2 | 3,
        title: getHeadingTitle(el)
    }));
    tree.value = buildTocTree(headings);
    headingElements = raw;
    activeId.value = tree.value.length ? tree.value[0].id : '';
}

function updateLayout() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const scroller =
        scrollerElement ?? document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    const post = document.querySelector('.post-container');
    if (!(scroller instanceof HTMLElement) || !post) {
        panelFits.value = false;
        document.documentElement.style.removeProperty('--toc-panel-left');
        document.documentElement.style.removeProperty('--toc-panel-width');
        return;
    }
    const postRight = post.getBoundingClientRect().right;
    const rightGap = scroller.getBoundingClientRect().right - postRight;
    // The side panel anchors just right of the article and grows into the empty
    // right gutter (up to a cap), so wider viewports get a wider, easier-to-read
    // TOC instead of leaving the right space unused.
    panelFits.value = rightGap >= PANEL_MIN_WIDTH + PANEL_GAP + PANEL_RIGHT_MARGIN;
    if (panelFits.value) {
        const width = Math.max(PANEL_MIN_WIDTH, Math.min(rightGap - PANEL_GAP - PANEL_RIGHT_MARGIN, PANEL_MAX_WIDTH));
        document.documentElement.style.setProperty('--toc-panel-left', `${Math.round(postRight + PANEL_GAP)}px`);
        document.documentElement.style.setProperty('--toc-panel-width', `${Math.round(width)}px`);
    } else {
        document.documentElement.style.removeProperty('--toc-panel-left');
        document.documentElement.style.removeProperty('--toc-panel-width');
    }
}

function measurePanelHeight() {
    const panelEl = document.querySelector('.article-toc__panel--fixed') as HTMLElement | null;
    if (panelEl) lastPanelHeight = panelEl.getBoundingClientRect().height;
}

function updateScrollState() {
    const scroller = scrollerElement;
    const body = bodyElement;
    if (!(scroller instanceof HTMLElement) || !(body instanceof HTMLElement)) {
        bodyActive.value = false;
        panelNearFooter.value = false;
        progressPct.value = 0;
        return;
    }
    const sRect = scroller.getBoundingClientRect();
    const bRect = body.getBoundingClientRect();
    // The body occupies the main viewport once the article header has scrolled off
    // the top (rect.top at/above the viewport) but the body hasn't fully scrolled
    // past yet (rect.bottom still below the top). The TOC therefore stays expanded
    // only while the reader is actually inside the article, and collapses both
    // when scrolling back up to the header and when scrolling past the body end.
    bodyActive.value = bRect.top <= 100 && bRect.bottom > 100;

    const vh = sRect.height;
    let nextProgressPct = 0;
    if (vh > 0) {
        const start = bRect.top - sRect.top + scroller.scrollTop;
        const end = bRect.bottom - sRect.top + scroller.scrollTop - vh;
        if (end <= start) {
            nextProgressPct = 100;
        } else {
            const p = (scroller.scrollTop - start) / (end - start);
            nextProgressPct = Number.isFinite(p) ? Math.round(Math.max(0, Math.min(1, p)) * 100) : 0;
        }
    }
    if (progressPct.value !== nextProgressPct) progressPct.value = nextProgressPct;

    const footer = footerElement;
    if (!(footer instanceof HTMLElement)) {
        panelNearFooter.value = false;
        return;
    }
    const footerTop = footer.getBoundingClientRect().top - sRect.top;
    const scrollerHeight = sRect.height;
    const halfHeight = lastPanelHeight ? lastPanelHeight / 2 : (scrollerHeight - 180) / 2;
    // The fixed panel is vertically centered in the scroller viewport, so its
    // bottom edge is the viewport midline plus half its height.
    const panelBottom = scrollerHeight / 2 + halfHeight;
    panelNearFooter.value = panelBottom + FOOTER_COLLISION_MARGIN >= footerTop;
}

function scheduleScrollStateUpdate() {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        updateScrollState();
    });
}

function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resolveArticleElements();
        updateLayout();
        measurePanelHeight();
        updateScrollState();
    }, 100);
}

function attachScrollListener() {
    scrollCleanup?.();
    scrollCleanup = null;
    const scroller =
        scrollerElement ?? document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (!(scroller instanceof HTMLElement)) return;
    const handleScroll = scheduleScrollStateUpdate;
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollState();
    scrollCleanup = () => scroller.removeEventListener('scroll', handleScroll);
}

function startObservers() {
    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (!(scroller instanceof HTMLElement)) return;
    if (headingElements.length) {
        headingObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) visibleSet.add(entry.target.id);
                    else visibleSet.delete(entry.target.id);
                });
                updateActiveFromVisible();
            },
            { root: scroller, rootMargin: `-${TOC_TOP_OFFSET}px 0px -55% 0px`, threshold: 0 }
        );
        headingElements.forEach((h) => headingObserver?.observe(h));
    }
    attachScrollListener();
}

function teardownObservers() {
    headingObserver?.disconnect();
    headingObserver = null;
    visibleSet.clear();
    if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = null;
    }
    scrollCleanup?.();
    scrollCleanup = null;
    scrollerElement = null;
    bodyElement = null;
    footerElement = null;
    bodyActive.value = false;
}

function reinit() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    teardownObservers();
    scan();
    updateLayout();
    measurePanelHeight();
    updateScrollState();
    startObservers();
    if (expanded.value) scrollActiveIntoView();
}

function expandAndLock() {
    userOpened.value = true;
    userClosed.value = false;
    scrollActiveIntoView();
}

function collapse() {
    if (autoExpanded.value) userClosed.value = true;
    userOpened.value = false;
}

function handleLinkClick(e: MouseEvent, id: string) {
    e.preventDefault();
    history.replaceState(null, '', `#${id}`);
    // Close the drawer after navigation; the fixed side panel stays open.
    if (!showFixedPanel.value) collapse();
    scrollToHeading(id);
}

function isCollapsed(id: string): boolean {
    return !isSectionOpen(id);
}

function toggleCollapse(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Flip the section relative to its current (auto or overridden) state and
    // record that as a manual override. The override is cleared automatically
    // once the reader scrolls into a different section (see the watch below).
    const next = new Map(manualOverrides.value);
    next.set(id, !isSectionOpen(id));
    manualOverrides.value = next;
}

function isItemVisible(entry: FlatEntry): boolean {
    if (entry.level === 2) return true;
    const parent = parentOf.value[entry.item.id];
    return !parent || isSectionOpen(parent);
}

watch(displayActiveId, () => {
    scrollActiveIntoView();
});

// Once the reader scrolls into a different section, drop any manual chevron
// overrides so the accordion snaps back to automatic control: the section just
// left auto-collapses and the newly entered one auto-expands.
watch(activeSectionId, () => {
    if (manualOverrides.value.size) manualOverrides.value = new Map();
});

// When the body leaves the main viewport (header returns or article ends), clear
// manual overrides so the capsule resumes its always-on state and the next
// scroll-down auto-expands again.
watch(bodyActive, (away) => {
    if (!away) {
        userClosed.value = false;
        userOpened.value = false;
    }
});

// Re-measure the panel once it has mounted so the cached height used for
// footer-collision prediction reflects the real layout.
watch(showFixedPanel, (shown) => {
    if (shown) {
        nextTick(() => {
            measurePanelHeight();
            updateScrollState();
            updateActiveMarker();
        });
    }
});

// Whenever the panel/drawer expands (auto or via capsule click), center the
// active item right away — otherwise the list sits at the top while the reader
// is already mid-article, so it looks like the TOC is not following.
watch(expanded, (now) => {
    if (now) scrollActiveIntoView();
    else updateActiveMarker();
});

onMounted(() => {
    nextTick(reinit);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('astro:page-load', reinit);
});

onUnmounted(() => {
    teardownObservers();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('astro:page-load', reinit);
    if (resizeTimer) clearTimeout(resizeTimer);
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    lastPanelHeight = 0;
    progressPct.value = 0;
    document.documentElement.style.removeProperty('--toc-panel-left');
    document.documentElement.style.removeProperty('--toc-panel-width');
});
</script>

<template>
    <div v-if="tree.length" class="article-toc" :aria-label="t('article.toc')">
        <Transition name="toc-capsule">
            <button
                v-if="showCapsule"
                type="button"
                class="article-toc__capsule"
                :aria-label="`${t('article.toc')}：${capsuleLabel}`"
                :aria-expanded="false"
                @click="expandAndLock"
            >
                <Icon name="bars-staggered" size="16px" />
                <span v-if="progressPct > 0" class="article-toc__capsule-progress">{{ progressPct }}%</span>
                <span class="article-toc__capsule-text">{{ capsuleLabel }}</span>
            </button>
        </Transition>

        <Transition name="toc-panel">
            <aside
                v-if="showFixedPanel"
                class="article-toc__panel article-toc__panel--fixed"
                role="navigation"
                :aria-label="t('article.toc')"
            >
                <header class="article-toc__header">
                    <span class="article-toc__title">{{ t('article.toc') }}</span>
                    <button
                        type="button"
                        class="article-toc__close"
                        :aria-label="t('article.toc.close')"
                        @click="collapse"
                    >
                        <Icon name="xmark" size="14px" />
                    </button>
                </header>
                <TransitionGroup name="toc-subitem" tag="ol" class="article-toc__list">
                    <span
                        key="active-marker"
                        class="article-toc__active-marker"
                        :style="activeMarkerStyle"
                        aria-hidden="true"
                    />
                    <template v-for="entry in flatEntries" :key="entry.item.id">
                        <li
                            v-if="isItemVisible(entry)"
                            :class="[
                                'article-toc__item',
                                `article-toc__item--level-${entry.level}`,
                                {
                                    'article-toc__item--active': entry.item.id === displayActiveId,
                                    'has-children': entry.level === 2 && childrenCount[entry.item.id] > 0
                                }
                            ]"
                        >
                            <a
                                :href="`#${entry.item.id}`"
                                class="article-toc__link"
                                @click="(e) => handleLinkClick(e, entry.item.id)"
                            >
                                {{ entry.item.title }}
                            </a>
                            <button
                                v-if="entry.level === 2 && childrenCount[entry.item.id] > 0"
                                type="button"
                                class="article-toc__toggle"
                                :class="{ 'article-toc__toggle--collapsed': isCollapsed(entry.item.id) }"
                                :aria-expanded="!isCollapsed(entry.item.id)"
                                :aria-label="t('article.toc.toggle')"
                                @click="(e) => toggleCollapse(entry.item.id, e)"
                            >
                                <Icon name="chevron-down" size="12px" />
                            </button>
                        </li>
                    </template>
                </TransitionGroup>
            </aside>
        </Transition>

        <Transition name="toc-overlay">
            <div v-if="showDrawer" class="article-toc__overlay" aria-hidden="true" @click="collapse" />
        </Transition>
        <Transition name="toc-drawer">
            <aside
                v-if="showDrawer"
                class="article-toc__panel article-toc__panel--drawer"
                role="dialog"
                aria-modal="true"
                :aria-label="t('article.toc')"
            >
                <header class="article-toc__header">
                    <span class="article-toc__title">{{ t('article.toc') }}</span>
                    <button
                        type="button"
                        class="article-toc__close"
                        :aria-label="t('article.toc.close')"
                        @click="collapse"
                    >
                        <Icon name="xmark" size="14px" />
                    </button>
                </header>
                <TransitionGroup name="toc-subitem" tag="ol" class="article-toc__list">
                    <span
                        key="active-marker"
                        class="article-toc__active-marker"
                        :style="activeMarkerStyle"
                        aria-hidden="true"
                    />
                    <template v-for="entry in flatEntries" :key="entry.item.id">
                        <li
                            v-if="isItemVisible(entry)"
                            :class="[
                                'article-toc__item',
                                `article-toc__item--level-${entry.level}`,
                                {
                                    'article-toc__item--active': entry.item.id === displayActiveId,
                                    'has-children': entry.level === 2 && childrenCount[entry.item.id] > 0
                                }
                            ]"
                        >
                            <a
                                :href="`#${entry.item.id}`"
                                class="article-toc__link"
                                @click="(e) => handleLinkClick(e, entry.item.id)"
                            >
                                {{ entry.item.title }}
                            </a>
                            <button
                                v-if="entry.level === 2 && childrenCount[entry.item.id] > 0"
                                type="button"
                                class="article-toc__toggle"
                                :class="{ 'article-toc__toggle--collapsed': isCollapsed(entry.item.id) }"
                                :aria-expanded="!isCollapsed(entry.item.id)"
                                :aria-label="t('article.toc.toggle')"
                                @click="(e) => toggleCollapse(entry.item.id, e)"
                            >
                                <Icon name="chevron-down" size="12px" />
                            </button>
                        </li>
                    </template>
                </TransitionGroup>
            </aside>
        </Transition>
    </div>
</template>
