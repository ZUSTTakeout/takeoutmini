<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
const props = defineProps<{ error?: boolean }>();
const mask = computed(() => {
  const drawing = props.error
    ? '<path d="M28 14h34l10 10v37H28V14Zm34 0v12h10M42 34l16 16m-16 0 16-16M15 63h67M17 43v10m63-12v9"/>'
    : '<path d="M25 28h46l4 32H21l4-32Zm12 0v-6a11 11 0 0 1 22 0v6M36 40h24m-18 8h12M13 63h70M14 24v15m-4-15v8c0 5 8 5 8 0v-8M81 24c-4 5-4 10 0 10v10"/>';
  return `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + drawing + '</svg>')}")`;
});
</script>
<template><view class="illustration" :style="{ maskImage: mask, '-webkit-mask-image': mask }" aria-hidden="true" /></template>
<style scoped>
.illustration { width: 192rpx; height: 144rpx; color: var(--color-text-tertiary); background: currentColor; mask-size: contain; mask-repeat: no-repeat; -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; }
</style>
