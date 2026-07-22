<script setup lang="ts">
defineProps<{
    copyrightText: string;
}>();
</script>

<template>
    <footer class="site-footer">
        <div class="footer-bottom">
            <span class="footer-copyright">{{ copyrightText }}</span>
            <span class="footer-tagline">Stay hydrated</span>
        </div>
    </footer>
</template>
