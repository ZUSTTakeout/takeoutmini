<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import { getPickupCode } from "../utils/order-number";

const props = defineProps<{ number: string }>();
const code = computed(() => getPickupCode(props.number));
</script>

<template>
  <view class="pickup-reference">
    <text class="pickup-label">{{ code ? '取餐码' : '取餐订单号' }}</text>
    <text :class="['pickup-code', { legacy: !code }]" user-select>{{ code || number }}</text>
    <text v-if="code" class="pickup-number" user-select>{{ number }}</text>
    <text class="pickup-caption">到店向商户出示此订单</text>
  </view>
</template>

<style scoped>
.pickup-reference { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); padding: var(--space-4); border: 2rpx solid var(--color-brand); border-radius: var(--radius-card); background: var(--color-surface); }
.pickup-label, .pickup-caption { color: var(--color-text-secondary); font-size: var(--font-caption); }
.pickup-code { max-width: 100%; color: var(--color-brand); font-size: 80rpx; font-weight: 750; line-height: 1.2; letter-spacing: 8rpx; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; text-align: center; }
.pickup-code.legacy { font-size: var(--font-title); letter-spacing: 2rpx; line-height: 1.5; }
.pickup-number { max-width: 100%; color: var(--color-text-secondary); font-size: var(--font-caption); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; text-align: center; }
</style>
