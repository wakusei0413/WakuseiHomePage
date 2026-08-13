<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { siteConfig } from '../data/site';
import { useI18n } from '../composables/useI18n';
import { buildContributionGrid, fetchContributionsSnapshot, type ContributionGrid } from '../lib/github-contributions';

/**
 * 左侧面板的 GitHub 提交格子图（替代原打字机 slogan）。
 * 数据在构建时同步为 /github-contributions.json（见 src/pages/github-contributions.json.ts），
 * 挂载后只读取站内快照（一整年数据），渲染 53 列格子图；
 * 加载中显示提示文案，快照缺失/损坏时降级为普通 GitHub 链接卡片。
 */
const { t } = useI18n();

const state = ref<'loading' | 'ready' | 'error'>('loading');
const grid = ref<ContributionGrid | null>(null);
let controller: AbortController | null = null;

onMounted(() => {
    controller = new AbortController();
    fetchContributionsSnapshot({ signal: controller.signal })
        .then((payload) => {
            grid.value = buildContributionGrid(payload.contributions);
            state.value = 'ready';
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
        class="github-contrib"
        :href="siteConfig.github.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="graphLabel"
    >
        <span class="github-contrib__label">{{ t('widgets.github.kicker') }}</span>

        <span v-if="state === 'loading'" class="github-contrib__message">
            {{ t('widgets.github.loading') }}
        </span>

        <span v-else-if="state === 'error'" class="github-contrib__message">
            {{ t('widgets.github.fallback') }}
        </span>

        <template v-else>
            <span v-if="grid" class="github-contrib__graph" role="presentation">
                <span v-for="(week, weekIndex) in grid.weeks" :key="weekIndex" class="github-contrib__week">
                    <span
                        v-for="cell in week"
                        :key="cell.date"
                        class="github-contrib__cell"
                        :class="`github-contrib__cell--l${cell.level}`"
                        :title="`${cell.date} · ${cell.count}`"
                    />
                </span>
            </span>
            <span class="github-contrib__total">{{ totalLabel }}</span>
        </template>
    </a>
</template>
