<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import { formatMoney } from "../utils/format";
import type { ReIconName } from "../icons";
withDefaults(defineProps<{ count: number; total: number; name?: ReIconName; label: string; loading?: boolean; disabled?: boolean }>(), { name: "arrow-right", loading: false, disabled: false });
defineEmits<{ action: [] }>();
</script>
<template>
  <view class="checkout-dock">
    <view class="checkout-bar">
      <ReIcon name="cart" color="brand" :size="24" />
      <view class="amount"><text class="count">共 {{ count }} 份</text><text :key="total" class="total motion-count">{{ formatMoney(total) }}</text></view>
      <view class="checkout-action"><text class="action-label">{{ label }}</text><IconButton :name="name" :label="label" variant="primary" :loading="loading" :disabled="disabled" @click="$emit('action')" /></view>
    </view>
  </view>
</template>
<style scoped>
.checkout-dock { position: sticky; bottom: 0; box-sizing: border-box; padding: var(--space-2) var(--space-4) calc(var(--space-2) + env(safe-area-inset-bottom)); border-top: 2rpx solid var(--color-border); background: var(--color-surface); }
.checkout-bar { display: flex; min-height: calc(var(--dock-height) - var(--space-4)); align-items: center; gap: var(--space-3); }
.amount { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: var(--space-1); }
.count { color: var(--color-text-secondary); font-size: var(--font-caption); }
.total { color: var(--color-text); font-size: var(--font-title); font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
.checkout-action { display: flex; flex: none; align-items: center; gap: var(--space-2); }
.action-label { color: var(--color-text); font-size: var(--font-caption); }
</style>
