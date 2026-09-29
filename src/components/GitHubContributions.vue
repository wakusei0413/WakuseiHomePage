<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Icon from './Icon.vue';
import { siteConfig } from '../data/site';
import { useI18n } from '../composables/useI18n';
import { buildContributionGrid, fetchContributionsSnapshot, type ContributionGrid } from '../lib/github-contributions';
import {
    easeOutBack,
    easeOutCubic,
    layoutSkyline,
    rampColor,
    shade,
    SKYLINE_GEOMETRY,
    skylineBounds,
    type Point,
    type SkylineLayout,
    TONE_FLOOR
} from '../lib/contribution-skyline';

/**
 * 左侧面板的 GitHub 提交"地形"：一年的贡献平滑成轴测 3D 缓坡，入场时地表从平地依次隆起。
 * 数据在构建时同步为 /github-contributions.json（见 src/pages/github-contributions.json.ts），
 * 挂载后只读取站内快照。加载中先画全零的平地砖（骨架），快照缺失/损坏时保留地面并显示降级文案。
 * 可见文字只有 kicker 与总数；完整信息放在链接的 aria-label 里。
 */
const { t } = useI18n();

const RISE_DURATION = 650;
const RISE_SPREAD = 900;
const COUNT_DURATION = RISE_SPREAD + RISE_DURATION;
/** 颜色渐变的量化级数（预先算好三面颜色，避免逐帧解析） */
const RAMP_STEPS = 24;
/** 高于该强度的峰顶带辉光 */
const GLOW_TONE = 0.85;

const state = ref<'loading' | 'ready' | 'error'>('loading');
const grid = ref<ContributionGrid | null>(null);
const displayCount = ref('');
const rootRef = ref<HTMLAnchorElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const bounds = skylineBounds();
const aspectRatio = `${bounds.width} / ${bounds.height}`;

interface FacePalette {
    top: string;
    front: string;
    right: string;
}

interface Palette {
    flat: FacePalette;
    ramp: FacePalette[];
    today: FacePalette;
    plinth: FacePalette;
    glow: string;
    ground: string;
}

let layout: SkylineLayout = layoutSkyline(buildContributionGrid([]));
let palette: Palette | null = null;
let animationStart = 0;
let animating = false;
let frameId = 0;
let controller: AbortController | null = null;
let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;

function faces(color: string): FacePalette {
    return { top: color, front: shade(color, 0.8), right: shade(color, 0.62) };
}

function readPalette(): Palette | null {
    if (!rootRef.value) return null;
    const style = getComputedStyle(rootRef.value);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    const stops = [
        read('--github-l1', '#9be9a8'),
        read('--github-l2', '#40c463'),
        read('--github-l3', '#30a14e'),
        read('--github-l4', '#216e39')
    ];
    return {
        flat: faces(read('--github-l0', 'rgba(0, 0, 0, 0.06)')),
        ramp: Array.from({ length: RAMP_STEPS + 1 }, (_, i) => faces(rampColor(stops, i / RAMP_STEPS))),
        today: faces(read('--accent-yellow', '#ffe600')),
        plinth: faces(read('--github-plinth', '#e6e3da')),
        glow: read('--github-glow', 'rgba(64, 196, 99, 0.45)'),
        ground: read('--github-ground', 'rgba(0, 0, 0, 0.08)')
    };
}

function prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function polygon(ctx: CanvasRenderingContext2D, points: Point[], fill: string) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
}

/** 绘制一帧；elapsed 为入场动画已进行的毫秒数（Infinity = 终态）。返回动画是否仍在进行。 */
function draw(elapsed: number): boolean {
    if (grid.value) {
        const countProgress = easeOutCubic(elapsed / COUNT_DURATION);
        displayCount.value = String(Math.round(grid.value.totalCount * countProgress));
    }

    const canvas = canvasRef.value;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !palette || canvas.width === 0) return false;

    const dpr = window.devicePixelRatio || 1;
    const scale = canvas.width / layout.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // 落地阴影：压扁的径向渐变
    const [cx, cy] = layout.groundCenter;
    const [rx, ry] = layout.groundRadius;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const ground = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    ground.addColorStop(0, palette.ground);
    ground.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 底座：整块地面向下挤出
    const [pBack, pRight, pFront, pLeft] = layout.plinth;
    const down = (p: Point): Point => [p[0], p[1] + layout.plinthDepth];
    polygon(ctx, [pLeft, pFront, down(pFront), down(pLeft)], palette.plinth.front);
    polygon(ctx, [pRight, pFront, down(pFront), down(pRight)], palette.plinth.right);
    polygon(ctx, [pBack, pRight, pFront, pLeft], palette.plinth.top);

    let running = false;
    const floor = SKYLINE_GEOMETRY.floorHeight;

    for (const bar of layout.bars) {
        const progress = (elapsed - bar.delay * RISE_SPREAD) / RISE_DURATION;
        if (progress < 1) running = true;
        const grow = progress <= 0 ? 0 : easeOutBack(progress);
        const h = Math.max(floor + (bar.height - floor) * grow, floor * 0.5);

        const [back, right, front, left] = bar.base;
        const up = (p: Point): Point => [p[0], p[1] - h];
        const colors = bar.isToday
            ? palette.today
            : bar.tone > TONE_FLOOR
              ? palette.ramp[Math.round(Math.min(bar.tone, 1) * RAMP_STEPS)]
              : palette.flat;

        polygon(ctx, [left, front, up(front), up(left)], colors.front);
        polygon(ctx, [right, front, up(front), up(right)], colors.right);

        const glowing = bar.tone >= GLOW_TONE || bar.isToday;
        if (glowing) {
            ctx.shadowColor = bar.isToday ? colors.top : palette.glow;
            ctx.shadowBlur = 8 * dpr;
        }
        polygon(ctx, [up(back), up(right), up(front), up(left)], colors.top);
        if (glowing) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    }

    return running;
}

function tick(now: number) {
    const running = draw(now - animationStart);
    if (running) {
        frameId = requestAnimationFrame(tick);
    } else {
        animating = false;
    }
}

function startRise() {
    cancelAnimationFrame(frameId);
    if (prefersReducedMotion()) {
        animating = false;
        draw(Infinity);
        return;
    }
    animating = true;
    animationStart = performance.now();
    frameId = requestAnimationFrame(tick);
}

function resizeCanvas() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const cssWidth = canvas.clientWidth;
    if (cssWidth === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(((cssWidth * layout.height) / layout.width) * dpr);
    // 动画进行中由下一帧重绘，避免重复绘制
    if (!animating) draw(Infinity);
}

function refreshPalette() {
    palette = readPalette();
    if (!animating) draw(Infinity);
}

onMounted(() => {
    palette = readPalette();
    resizeCanvas();

    if (typeof ResizeObserver !== 'undefined' && canvasRef.value) {
        resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvasRef.value);
    }
    themeObserver = new MutationObserver(refreshPalette);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    controller = new AbortController();
    fetchContributionsSnapshot({ signal: controller.signal })
        .then((payload) => {
            grid.value = buildContributionGrid(payload.contributions);
            layout = layoutSkyline(grid.value);
            state.value = 'ready';
            startRise();
        })
        .catch(() => {
            // 组件卸载导致的主动中止不算失败，不降级。
            if (!controller?.signal.aborted) {
                state.value = 'error';
            }
        });
});

onUnmounted(() => {
    controller?.abort();
    cancelAnimationFrame(frameId);
    resizeObserver?.disconnect();
    themeObserver?.disconnect();
});

const totalLabel = computed(() =>
    grid.value ? t('widgets.github.total').replace('{n}', String(grid.value.totalCount)) : ''
);

const graphLabel = computed(() => {
    const name = siteConfig.github.username;
    if (!grid.value) {
        // 加载/降级状态下把状态文案并入 aria-label，避免静态标签吞掉可读内容。
        return `${name} — ${state.value === 'error' ? t('widgets.github.fallback') : t('widgets.github.loading')}`;
    }
    return `${name} — ${totalLabel.value}（${grid.value.startDate} ~ ${grid.value.endDate}）`;
});
</script>

<template>
    <a
        ref="rootRef"
        class="github-contrib"
        :class="`github-contrib--${state}`"
        :href="siteConfig.github.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="graphLabel"
    >
        <span class="github-contrib__stage">
            <!-- 大号数字压在画布之下：左侧地面与山丘会叠在数字下沿，形成前后层次 -->
            <span class="github-contrib__head" aria-hidden="true">
                <Icon name="github" class="github-contrib__icon" size="1em" />
                <span v-if="state === 'ready'" class="github-contrib__count">{{ displayCount }}</span>
                <span class="github-contrib__arrow">↗</span>
            </span>

            <canvas ref="canvasRef" class="github-contrib__canvas" :style="{ aspectRatio }" aria-hidden="true" />
        </span>

        <span v-if="state === 'error'" class="github-contrib__message">
            {{ t('widgets.github.fallback') }}
        </span>
    </a>
</template>
