<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import { formatMoney } from "../utils/format";
import type { ReIconName } from "../icons";
withDefaults(defineProps<{
  count: number; total: number; name?: ReIconName; label: string; loading?: boolean; disabled?: boolean;
}>(), { name: "arrow-right", loading: false, disabled: false });
defineEmits<{ action: [] }>();
</script>

<template>
  <view class="checkout-dock motion-enter">
    <view class="checkout-bar">
      <view class="cart-mark"><ReIcon name="cart" color="white" :size="24" /><text :key="count" class="cart-count motion-count">{{ count }}</text></view>
      <view class="amount"><text class="count">共 {{ count }} 份</text><text :key="total" class="total motion-count">{{ formatMoney(total) }}</text></view>
      <view class="checkout-action"><text class="action-label">{{ label }}</text><IconButton :name="name" :label="label" variant="primary" :loading="loading" :disabled="disabled" @click="$emit('action')" /></view>
    </view>
  </view>
</template>

<style scoped>
.checkout-dock { position: fixed; right: 0; bottom: 0; left: 0; z-index: 10; box-sizing: border-box; padding: 10px 16px calc(12px + env(safe-area-inset-bottom)); background: var(--color-background); }
.checkout-bar { display: flex; min-height: 74px; box-sizing: border-box; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 22px; background: var(--color-text); box-shadow: 0 6px 24px rgba(32, 45, 70, 0.12); }
.cart-mark { display: flex; flex: none; flex-direction: column; align-items: center; gap: 2px; }
.cart-count { color: #bdc9f2; font-size: 10px; line-height: 1.2; }
.amount { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.count { color: #b0bedb; font-size: 10px; }
.total { color: var(--color-surface); font-size: 22px; font-weight: 750; line-height: 1.2; overflow-wrap: anywhere; }
.checkout-action { display: flex; flex: none; align-items: center; gap: 9px; }
.action-label { color: #d4ddf5; font-size: 11px; }
@media (max-width: 350px) { .cart-mark { display: none; } .checkout-bar { gap: 8px; padding: 12px; } .checkout-action { gap: 5px; } }
</style>
