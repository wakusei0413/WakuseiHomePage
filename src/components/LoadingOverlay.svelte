<script lang="ts">
    let { hidden, text, percent }: { hidden: boolean; text: string; percent: number } = $props();
</script>

<div class="loading-overlay" class:hidden>
    <div class="loading-panel">
        <div class="loading-spinner"></div>
        <div class="loading-text">{text}</div>
        <div class="loading-progress">
            <div class="loading-bar" style="width: {percent}%"></div>
        </div>
        <div class="loading-percent">{percent}%</div>
    </div>
</div>
