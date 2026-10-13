<script setup lang="ts">
import { ref, watch } from "vue";
import ReIcon from "./ReIcon.vue";
import type { ReIconName } from "../icons";

const props = withDefaults(defineProps<{
  src?: string | null;
  size?: number;
  icon?: ReIconName;
}>(), { src: "", size: 72, icon: "restaurant" });

const failed = ref(false);
watch(() => props.src, () => { failed.value = false; });
</script>

<template>
  <view class="food-image" :style="{ width: `${size}px`, height: `${size}px` }">
    <image v-if="src && !failed" class="picture" :src="src" mode="aspectFill" @error="failed = true" />
    <ReIcon v-else :name="icon" color="brand" :size="Math.min(30, size / 2)" />
  </view>
</template>

<style scoped>
.food-image { display: flex; flex: none; align-items: center; justify-content: center; overflow: hidden; border-radius: 12px; background: var(--color-brand-soft); }
.picture { display: block; width: 100%; height: 100%; }
</style>
