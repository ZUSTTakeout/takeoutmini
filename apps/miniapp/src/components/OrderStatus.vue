<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import type { OrderStatus, PaymentStatus } from "../types";
import { STATUS_TEXT } from "../utils/order";
defineProps<{ status: OrderStatus; paymentStatus?: PaymentStatus }>();
</script>

<template>
  <view :class="['order-status', status.toLowerCase(), { pending: status === 'CREATED' && paymentStatus === 'PENDING' }]"><view class="status-dot" /><text>{{ status === 'CREATED' && paymentStatus === 'PENDING' ? '待付款' : STATUS_TEXT[status] }}</text></view>
</template>

<style scoped>
.order-status { display: inline-flex; flex: none; align-items: center; gap: 10rpx; padding: 10rpx 18rpx; border-radius: var(--radius-control); background: var(--color-brand-soft); color: var(--color-brand); font-size: var(--font-caption); font-weight: 650; white-space: nowrap; transition: background var(--motion-normal), color var(--motion-normal); }
.status-dot { width: 8rpx; height: 8rpx; flex: none; border-radius: 50%; background: currentColor; }
.accepted { background: var(--color-success-soft); color: var(--color-success); }
.pending { background: var(--color-warning-soft); color: var(--color-warning); }
.ready { background: var(--color-brand-soft); color: var(--color-brand); }

.completed { background: var(--color-success-soft); color: var(--color-success); }
.cancelled { background: var(--color-input); color: var(--color-text-secondary); }
@media (prefers-reduced-motion: reduce) { .order-status { transition: none; } .status-dot { animation: none !important; } }
</style>
