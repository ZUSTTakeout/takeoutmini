<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
import type { ReIconName } from "../icons";
withDefaults(defineProps<{ name: ReIconName; label: string; note?: string; loading?: boolean; disabled?: boolean }>(), { note: "", loading: false, disabled: false });
defineEmits<{ action: [] }>();
</script>

<template>
  <view class="action-dock">
    <view class="action-copy"><text class="action-title">{{ label }}</text><text v-if="note" class="action-note">{{ note }}</text></view>
    <IconButton :name="name" :label="label" variant="primary" :loading="loading" :disabled="disabled" @click="$emit('action')" />
  </view>
</template>

<style scoped>
.action-dock { position: fixed; right: 0; bottom: 0; left: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-sizing: border-box; min-height: 80px; padding: 16px 22px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: var(--color-surface); }
.action-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }
.action-title { color: var(--color-text); font-size: 14px; font-weight: 700; }
.action-note { color: var(--color-text-secondary); font-size: 11px; }
</style>
