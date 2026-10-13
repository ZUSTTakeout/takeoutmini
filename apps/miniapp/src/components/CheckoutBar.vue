<script setup lang="ts">
import IconButton from "./IconButton.vue";
import { formatMoney } from "../utils/format";
import type { ReIconName } from "../icons";

withDefaults(defineProps<{
  count: number;
  total: number;
  name?: ReIconName;
  label: string;
  loading?: boolean;
  disabled?: boolean;
}>(), { name: "cart", loading: false, disabled: false });
defineEmits<{ action: [] }>();
</script>

<template>
  <view class="checkout-bar">
    <view class="amount">
      <text class="count">共 {{ count }} 份</text>
      <text class="total">{{ formatMoney(total) }}</text>
    </view>
    <IconButton :name="name" :label="label" variant="primary" :loading="loading" :disabled="disabled" @click="$emit('action')" />
  </view>
</template>

<style scoped>
.checkout-bar { position: fixed; right: 0; bottom: 0; left: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 68px; box-sizing: border-box; padding: 12px 20px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: #fff; }
.amount { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }
.count { color: var(--color-text-secondary); font-size: 11px; }
.total { overflow-wrap: anywhere; color: var(--color-brand); font-size: 22px; font-weight: 750; line-height: 1.1; }
</style>
