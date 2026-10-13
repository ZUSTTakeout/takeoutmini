<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import paths from "./paths.json";
const props = withDefaults(defineProps<{ name: keyof typeof paths; size?: number | string; color?: string }>(), { size: 24, color: "inherit" });
const dimension = computed(() => typeof props.size === "number" ? `${props.size * 2}rpx` : props.size);
const source = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[props.name]}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
});
const style = computed(() => ({
  width: dimension.value, height: dimension.value,
  color: props.color === "inherit" ? "inherit" : `var(--icon-${props.color}, currentColor)`,
  maskImage: source.value, "-webkit-mask-image": source.value,
}));
</script>
<template><view class="svg-icon" :style="style" aria-hidden="true" /></template>
<style scoped>
.svg-icon { display: inline-block; flex: none; vertical-align: middle; background-color: currentColor; mask-repeat: no-repeat; mask-position: center; mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain; }
</style>
