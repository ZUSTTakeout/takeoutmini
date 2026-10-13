<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import IconButton from "./IconButton.vue";
import FoodImage from "./FoodImage.vue";
import PrimaryAction from "./PrimaryAction.vue";
import { formatOrderTime } from "../utils/time";
import OrderStatus from "./OrderStatus.vue";
import { formatMoney } from "../utils/format";
import { isPendingPayment, orderItemsText } from "../utils/order";
import type { Order } from "../types";

const props = withDefaults(
  defineProps<{
    order: Order;
    showShop?: boolean;
    showCancel?: boolean;
    cancelling?: boolean;
    clickable?: boolean;
  }>(),
  {
    showShop: false,
    showCancel: false,
    cancelling: false,
    clickable: false,
  },
);

const emit = defineEmits<{ open: []; cancel: [] }>();
const itemsText = computed(() => orderItemsText(props.order));
const itemCount = computed(() => props.order.items.reduce((count, item) => count + item.quantity, 0));
const orderTime = computed(() => formatOrderTime(props.order.createdAt));
</script>

<template>
  <view :class="['order', { clickable, compact: !showShop, ready: order.status === 'READY' }]" :role="clickable ? 'button' : undefined" hover-class="order-pressed" :hover-stay-time="100" @click="clickable && emit('open')">
    <view class="order-top">
      <view v-if="showShop" class="shop-identity">
        <FoodImage :size="40" />
        <view class="order-heading"><text class="shop-name">{{ order.shop.name }}</text><text class="order-caption">到店自取 · {{ itemCount }} 份</text></view>
      </view>
      <text v-else class="compact-number">{{ order.number }}</text>
      <OrderStatus :key="order.status + order.paymentStatus" :status="order.status" :payment-status="order.paymentStatus" />
    </view>
    <text class="items">{{ itemsText }}</text>
    <view class="order-meta"><text class="order-time">下单 {{ orderTime }}</text><text class="total">{{ formatMoney(order.total) }}</text></view>
    <view class="order-foot">
      <text class="order-number">{{ showShop ? order.number : `共 ${itemCount} 份 · 到店自取` }}</text>
      <view v-if="showShop" class="order-actions">
        <IconButton v-if="showCancel && order.status === 'CREATED'" name="close" label="取消订单" variant="danger" compact :loading="cancelling" @click="emit('cancel')" />
        <template v-if="clickable && isPendingPayment(order)"><text class="order-caption">去付款</text><IconButton name="arrow-right" label="去付款" variant="primary" compact @click="emit('open')" /></template>
        <PrimaryAction v-else-if="clickable && order.status === 'READY'" label="去取餐" icon="bag" @click="emit('open')" />
        <IconButton v-else-if="clickable" name="arrow-right" label="查看订单详情" variant="secondary" compact @click="emit('open')" />
      </view>
      <slot v-else name="action" />
    </view>
  </view>
</template>

<style scoped>
.order { margin-bottom: 30rpx; padding: var(--space-4); border: 2rpx solid transparent; border-radius: var(--radius-card); background: var(--color-surface); transition: background var(--motion-fast); }
.order-pressed { background: var(--color-brand-soft); }
.order-top, .order-meta, .order-foot { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.shop-identity { display: flex; min-width: 0; flex: 1; align-items: center; gap: 22rpx; }
.shop-symbol { display: flex; width: 92rpx; height: 92rpx; flex: none; align-items: center; justify-content: center; border-radius: var(--radius-card); background: var(--color-brand-soft); }
.order-heading { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 10rpx; }
.shop-name { color: var(--color-text); font-size: var(--font-body); font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.order-number { min-width: 0; flex: 1; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.order-caption, .order-number { color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.5; }
.compact-number { min-width: 0; flex: 1; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; color: var(--color-text); font-size: var(--font-body); font-weight: 700; }
.items { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin: 36rpx 0 26rpx; color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.7; overflow-wrap: anywhere; }
.order-time { color: var(--color-text-secondary); font-size: var(--font-caption); }
.total { flex: none; color: var(--color-text); font-size: var(--font-title); font-weight: 750; }
.order-foot { margin-top: 32rpx; padding-top: 24rpx; border-top: 2rpx solid var(--color-border); }
.order-actions { display: flex; flex: none; align-items: center; gap: 18rpx; }
.compact .items { margin: 24rpx 0; }
@media (max-width: 700rpx) { .order-top { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { .order { transition: none; } }
.order.ready { border-color: var(--color-brand); }
.ready .total { color: var(--color-brand); }
</style>
