<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import OrderStatus from "./OrderStatus.vue";
import { formatMoney } from "../utils/format";
import { orderItemsText } from "../utils/order";
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
const orderTime = computed(() => {
  const date = new Date(props.order.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date);
});
</script>

<template>
  <view :class="['order', { clickable, compact: !showShop }]" :role="clickable ? 'button' : undefined" hover-class="order-pressed" :hover-stay-time="100" @click="clickable && emit('open')">
    <view class="order-top">
      <view v-if="showShop" class="shop-identity">
        <view class="shop-symbol"><ReIcon name="store" color="brand" :size="25" /></view>
        <view class="order-heading"><text class="shop-name">{{ order.shop.name }}</text><text class="order-caption">到店自取 · {{ itemCount }} 份</text></view>
      </view>
      <text v-else class="compact-number">#{{ order.number.slice(-6) }}</text>
      <OrderStatus :key="order.status" :status="order.status" />
    </view>
    <text class="items">{{ itemsText }}</text>
    <view class="order-meta"><text class="order-time">{{ orderTime }}</text><text class="total">{{ formatMoney(order.total) }}</text></view>
    <view class="order-foot">
      <text class="order-number">{{ showShop ? `#${order.number.slice(-6)}` : `共 ${itemCount} 份 · 到店自取` }}</text>
      <view v-if="showShop" class="order-actions">
        <IconButton v-if="showCancel && order.status === 'CREATED'" name="close" label="取消订单" variant="danger" compact :loading="cancelling" @click="emit('cancel')" />
        <IconButton v-if="clickable" name="arrow-right" label="查看订单详情" variant="secondary" compact @click="emit('open')" />
      </view>
      <slot v-else name="action" />
    </view>
  </view>
</template>

<style scoped>
.order { margin-bottom: 15px; padding: 20px; border-radius: var(--radius-card); background: var(--color-surface); transition: background var(--motion-fast); }
.order-pressed { background: var(--color-brand-soft); }
.order-top, .order-meta, .order-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.shop-identity { display: flex; min-width: 0; flex: 1; align-items: center; gap: 11px; }
.shop-symbol { display: flex; width: 46px; height: 46px; flex: none; align-items: center; justify-content: center; border-radius: 14px; background: var(--color-brand-soft); }
.order-heading { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.shop-name { color: var(--color-text); font-size: 15px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.order-caption, .order-number { color: var(--color-text-secondary); font-size: 10px; line-height: 1.5; }
.compact-number { color: var(--color-text); font-size: 14px; font-weight: 700; }
.items { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin: 18px 0 13px; color: #536079; font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
.order-time { color: var(--color-text-secondary); font-size: 11px; }
.total { flex: none; color: var(--color-text); font-size: 20px; font-weight: 750; }
.order-foot { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--color-border); }
.order-actions { display: flex; align-items: center; gap: 9px; }
.compact .items { margin: 12px 0; }
@media (max-width: 350px) { .order-top { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { .order { transition: none; } }
</style>
