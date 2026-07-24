<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTime } from '../composables/useTime';
import type { TimeConfig } from '../types/site';

const props = withDefaults(
    defineProps<{
        config: TimeConfig;
        compact?: boolean;
    }>(),
    { compact: false }
);

const { timeString, dateParts } = useTime(props.config);
// base.css hides .clock/.weekday/.date-display until .clock--entered is set.
const entered = ref(false);

onMounted(() => {
    requestAnimationFrame(() => {
        entered.value = true;
    });
});
</script>

<template>
    <div class="time-widget" :class="{ 'time-widget--compact': compact, 'clock--entered': entered }">
        <div v-if="config.showWeekday" class="weekday" :class="{ 'clock--entered': entered }">
            {{ dateParts.weekday }}
        </div>
        <div
            v-if="config.showDate && dateParts.dateDisplay"
            class="date-display"
            :class="{ 'clock--entered': entered }"
        >
            {{ dateParts.dateDisplay }}
        </div>
        <div class="clock" :class="{ 'clock--entered': entered }">{{ timeString }}</div>
    </div>
</template>
