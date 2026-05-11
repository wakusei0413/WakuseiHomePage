<script setup lang="ts">
import { useSlogan } from '../composables/useSlogan';
import type { CursorStyle, SlogansConfig } from '../types/site';

const props = defineProps<{
    config: SlogansConfig;
    cursorStyle: CursorStyle;
}>();

const { text, cursorDimmed, isIdle } = useSlogan(props.config);
</script>

<template>
    <p class="bio">
        <span class="typewriter-text">{{ text }}</span>
        <span
            class="typewriter-cursor"
            :class="{ 'cursor-idle': isIdle }"
            :style="{ opacity: cursorDimmed ? '0.5' : '1' }"
        >
            {{ cursorStyle === 'line' ? '|' : '\u2588' }}
        </span>
    </p>
</template>
