<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import ReIcon from "./ReIcon.vue";
defineProps<{ modelValue: "list" | "gallery" }>();
defineEmits<{ "update:modelValue": [value: "list" | "gallery"] }>();
</script>

<template>
  <view class="view-mode-switch">
    <button :class="['view-option', { selected: modelValue === 'list' }]" aria-label="行视图" :aria-pressed="modelValue === 'list'" hover-class="option-pressed" @click="$emit('update:modelValue', 'list')"><ReIcon name="list" :color="modelValue === 'list' ? 'brand' : 'secondary'" :size="19" /></button>
    <button :class="['view-option', { selected: modelValue === 'gallery' }]" aria-label="相册视图" :aria-pressed="modelValue === 'gallery'" hover-class="option-pressed" @click="$emit('update:modelValue', 'gallery')"><ReIcon name="gallery" :color="modelValue === 'gallery' ? 'brand' : 'secondary'" :size="19" /></button>
  </view>
</template>

<style scoped>
.view-mode-switch { display: flex; flex: none; gap: var(--space-1); }
.view-option { display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; margin: 0; padding: 0; border: 0; border-radius: 50%; background: transparent; line-height: 1; }
.view-option.selected { background: var(--color-brand-soft); }
.view-option.option-pressed { opacity: 0.65; }
</style>
