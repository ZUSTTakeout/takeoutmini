<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import FoodImage from "./FoodImage.vue";
import { formatOrderTime, elapsedTime } from "../utils/time";
import OrderStatus from "./OrderStatus.vue";
import { formatMoney } from "../utils/format";
import { ACTION_TEXT, NEXT_STATUS } from "../utils/order";
import type { Order } from "../types";
const props = withDefaults(defineProps<{ order: Order; busy?: boolean; disabled?: boolean; image?: string | null; now?: number }>(), { busy: false, disabled: false });
defineEmits<{ open: []; advance: []; cancel: [] }>();
const itemCount = computed(() => props.order.items.reduce((count, item) => count + item.quantity, 0));
const actionLabel = computed(() => ({ CREATED: "接单", ACCEPTED: "出餐", READY: "完成" })[props.order.status as "CREATED" | "ACCEPTED" | "READY"]);
const time = computed(() => formatOrderTime(props.order.createdAt));
const waiting = computed(() => elapsedTime(props.order.createdAt, props.now));
</script>

<template>
  <view class="order-row">
    <view class="order-heading" role="button" aria-label="查看订单" @click="$emit('open')"><text class="number">#{{ order.number }}</text><OrderStatus :key="order.status" :status="order.status" /></view>
    <view class="order-body" role="button" aria-label="查看商品明细" @click="$emit('open')">
      <FoodImage :src="image" :size="40" />
      <view class="order-main"><text class="items">{{ order.items.map((item) => item.name).join('、') }}</text><text class="meta">{{ itemCount }} 份</text></view>
      <text class="total">{{ formatMoney(order.total) }}</text>
    </view>
    <view class="order-time"><text>下单 {{ time }}</text><text>{{ waiting }}</text></view>
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
.order-row { margin-bottom: 30rpx; padding: var(--space-4); border-radius: var(--radius-card); background: var(--color-surface); }
.order-heading, .order-body, .order-bottom, .order-actions { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.number { min-width: 0; flex: 1; color: var(--color-text); font-size: var(--font-caption); font-weight: 700; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.order-body { margin-top: 38rpx; align-items: flex-start; }
.food-mark { display: flex; width: 92rpx; height: 92rpx; flex: none; align-items: center; justify-content: center; border-radius: var(--radius-card); background: var(--color-brand-soft); }
.order-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 16rpx; }
.items { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: var(--color-text); font-size: var(--font-body); font-weight: 600; line-height: 1.6; overflow-wrap: anywhere; }
.meta { color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.6; }
.total { flex: none; max-width: 192rpx; color: var(--color-brand); font-size: var(--font-body); font-weight: 750; line-height: 1.5; overflow-wrap: anywhere; }
.remark { display: flex; align-items: flex-start; gap: 14rpx; margin-top: 32rpx; color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.6; }
.remark text { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.order-bottom { margin-top: 34rpx; padding-top: 24rpx; border-top: 2rpx solid var(--color-border); }
.order-actions { gap: 18rpx; }
.action-label { color: var(--color-brand); font-size: var(--font-caption); font-weight: 600; }
.order-time { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-1); margin-top: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-caption); }
</style>
