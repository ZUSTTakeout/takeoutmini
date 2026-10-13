<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { ref, watch } from "vue";
import ReIcon from "./ReIcon.vue";
import type { ReIconName } from "../icons";

const props = withDefaults(defineProps<{
  src?: string | null;
  size?: number;
  fill?: boolean;
  icon?: ReIconName;
}>(), { src: "", size: 72, fill: false, icon: "restaurant" });

const failed = ref(false);
watch(() => props.src, () => { failed.value = false; });
</script>

<template>
  <view class="food-image" :style="{ width: fill ? '100%' : `${size * 2}rpx`, height: fill ? '100%' : `${size * 2}rpx` }">
    <image v-if="src && !failed" class="picture" :src="src" mode="aspectFill" @error="failed = true" />
    <ReIcon v-else name="restaurant" color="secondary" :size="Math.min(30, size / 2)" />
  </view>
</template>

<style scoped>
.food-image { display: flex; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: var(--radius-card); background: var(--color-input); }
.picture { display: block; width: 100%; height: 100%; animation: content-enter var(--motion-normal) var(--motion-ease) both; }
@media (prefers-reduced-motion: reduce) { .picture { animation: none; } }
</style>
