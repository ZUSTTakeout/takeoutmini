<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import ReIcon from "./ReIcon.vue";
import type { ReIconName } from "../icons";
defineProps<{ items: Array<{ key: string; title: string; icon: ReIconName; tone?: "brand" | "success" | "danger" }> }>();
defineEmits<{ select: [key: string] }>();
</script>

<template>
  <view class="shortcut-grid">
    <view v-for="item in items" :key="item.key" class="shortcut" role="button" :aria-label="item.title" hover-class="shortcut-pressed" @click="$emit('select', item.key)">
      <view :class="['shortcut-icon', item.tone || 'brand']"><ReIcon :name="item.icon" :color="item.tone || 'brand'" :size="25" /></view><text>{{ item.title }}</text>
    </view>
  </view>
</template>

<style scoped>
.shortcut-grid { display: flex; gap: 10px; padding: 25px 0; }
.shortcut { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; gap: 11px; color: var(--color-text); font-size: 11px; }
.shortcut-icon { display: flex; width: 52px; height: 52px; align-items: center; justify-content: center; border-radius: 17px; background: var(--color-brand-soft); transition: transform var(--motion-fast); }
.shortcut-icon.success { background: var(--color-success-soft); }
.shortcut-icon.danger { background: var(--color-accent-soft); }
.shortcut-pressed .shortcut-icon { transform: scale(0.94); }
@media (prefers-reduced-motion: reduce) { .shortcut-icon { transition: none; } .shortcut-pressed .shortcut-icon { transform: none; } }
</style>
