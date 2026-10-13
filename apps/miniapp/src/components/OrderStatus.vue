<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import type { OrderStatus } from "../types";
import { STATUS_TEXT } from "../utils/order";
defineProps<{ status: OrderStatus }>();
</script>

<template>
  <view :class="['order-status', status.toLowerCase()]"><view class="status-dot" /><text>{{ STATUS_TEXT[status] }}</text></view>
</template>

<style scoped>
.order-status { display: inline-flex; flex: none; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 7px; background: var(--color-brand-soft); color: var(--color-brand); font-size: 10px; font-weight: 650; white-space: nowrap; transition: background var(--motion-normal), color var(--motion-normal); }
.status-dot { width: 4px; height: 4px; flex: none; border-radius: 50%; background: currentColor; }
.accepted { background: var(--color-success-soft); color: var(--color-success); }
.ready { background: var(--color-accent-soft); color: var(--color-accent); }
.ready .status-dot { animation: status-breathe 1800ms ease-in-out infinite; }
.completed { background: var(--color-success-soft); color: var(--color-success); }
.cancelled { background: var(--color-input); color: var(--color-text-secondary); }
@media (prefers-reduced-motion: reduce) { .order-status { transition: none; } .status-dot { animation: none !important; } }
</style>
