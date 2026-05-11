<script lang="ts">
    import { onMount } from 'svelte';
    import { formatDateParts, formatTimeString } from '../lib/time';
    import type { TimeConfig } from '../types/site';
    import { getLocale } from '../lib/i18n.svelte';

    let { config }: { config: TimeConfig } = $props();

    let now = $state(new Date());
    let timer: ReturnType<typeof setInterval> | null = null;

    let locale = $derived(getLocale());

    onMount(() => {
        timer = setInterval(() => {
            now = new Date();
        }, config.updateInterval);

        return () => {
            if (timer) clearInterval(timer);
        };
    });

    let dateParts = $derived(formatDateParts(now, locale));
</script>

<div class="clock">{formatTimeString(now, config.format)}</div>
<div class="weekday">{dateParts.weekday}</div>
{#if dateParts.dateDisplay}
    <div class="date-display">{dateParts.dateDisplay}</div>
{/if}
