<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import OrderStatus from "./OrderStatus.vue";
import { formatMoney } from "../utils/format";
import { ACTION_TEXT, NEXT_STATUS } from "../utils/order";
import type { Order } from "../types";
const props = withDefaults(defineProps<{ order: Order; busy?: boolean; disabled?: boolean }>(), { busy: false, disabled: false });
defineEmits<{ open: []; advance: []; cancel: [] }>();
const itemCount = computed(() => props.order.items.reduce((count, item) => count + item.quantity, 0));
const actionLabel = computed(() => ({ CREATED: "接单", ACCEPTED: "出餐", READY: "完成" })[props.order.status as "CREATED" | "ACCEPTED" | "READY"]);
const time = computed(() => {
  const date = new Date(props.order.createdAt);
  return Number.isNaN(date.getTime()) ? "" : `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
});
</script>

<template>
  <view class="order-row">
    <view class="order-heading" role="button" aria-label="查看订单" @click="$emit('open')"><text class="number">#{{ order.number }}</text><OrderStatus :key="order.status" :status="order.status" /></view>
    <view class="order-body" role="button" aria-label="查看商品明细" @click="$emit('open')">
      <view class="food-mark"><ReIcon name="restaurant" color="brand" :size="25" /></view>
      <view class="order-main"><text class="items">{{ order.items.map((item) => item.name).join('、') }}</text><text class="meta">{{ itemCount }} 份 · {{ time }}</text></view>
      <text class="total">{{ formatMoney(order.total) }}</text>
    </view>
    <view v-if="order.remark" class="remark"><ReIcon name="chat" color="secondary" :size="14" /><text>{{ order.remark }}</text></view>
    <view class="order-bottom">
      <IconButton name="chevron-right" label="查看订单详情" variant="secondary" compact @click="$emit('open')" />
      <view class="order-actions">
        <IconButton v-if="order.status === 'CREATED' || order.status === 'ACCEPTED'" name="close" label="拒绝订单" variant="danger" compact :disabled="disabled" :loading="busy" @click="$emit('cancel')" />
        <text v-if="NEXT_STATUS[order.status]" class="action-label">{{ actionLabel }}</text>
        <IconButton v-if="NEXT_STATUS[order.status]" :name="order.status === 'ACCEPTED' ? 'bag' : 'check'" :label="ACTION_TEXT[order.status] || '更新订单状态'" variant="primary" compact :disabled="disabled" :loading="busy" @click="$emit('advance')" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.order-row { margin-bottom: 15px; padding: 19px; border-radius: var(--radius-card); background: var(--color-surface); }
.order-heading, .order-body, .order-bottom, .order-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.number { min-width: 0; flex: 1; color: var(--color-text); font-size: 12px; font-weight: 700; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.order-body { margin-top: 19px; align-items: flex-start; }
.food-mark { display: flex; width: 46px; height: 46px; flex: none; align-items: center; justify-content: center; border-radius: 14px; background: var(--color-brand-soft); }
.order-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8px; }
.items { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: var(--color-text); font-size: 13px; font-weight: 600; line-height: 1.6; overflow-wrap: anywhere; }
.meta { color: var(--color-text-secondary); font-size: 10px; line-height: 1.6; }
.total { flex: none; max-width: 96px; color: var(--color-accent); font-size: 16px; font-weight: 750; line-height: 1.5; overflow-wrap: anywhere; }
.remark { display: flex; align-items: flex-start; gap: 7px; margin-top: 16px; color: var(--color-text-secondary); font-size: 11px; line-height: 1.6; }
.remark text { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.order-bottom { margin-top: 17px; padding-top: 12px; border-top: 1px solid var(--color-border); }
.order-actions { gap: 9px; }
.action-label { color: var(--color-brand); font-size: 12px; font-weight: 600; }
</style>
