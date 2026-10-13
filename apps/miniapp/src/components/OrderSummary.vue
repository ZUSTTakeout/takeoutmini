<script setup lang="ts">
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
  <view
    :class="['order', { clickable, compact: !showShop }]"
    :role="clickable ? 'button' : undefined"
    @click="clickable && emit('open')"
  >
    <view class="order-top">
      <view v-if="showShop" class="shop-identity">
        <view class="shop-symbol"><ReIcon name="store" color="brand" :size="25" /></view>
        <view class="order-heading">
          <view class="shop-name">{{ order.shop.name }}</view>
          <view class="order-number">到店自取 · {{ itemCount }} 件商品</view>
        </view>
      </view>
      <text v-else class="compact-number">#{{ order.number.slice(-6) }}</text>
      <OrderStatus :status="order.status" />
    </view>
    <view class="items">{{ itemsText }}</view>
    <view class="order-meta">
      <text class="order-time">{{ orderTime }}</text>
      <text class="total">{{ formatMoney(order.total) }}</text>
    </view>
    <van-divider custom-style="margin: 14px 0; border-color: #eee7df;" />
    <view class="order-foot">
      <text class="order-number">{{ showShop ? `#${order.number.slice(-6)}` : `共 ${itemCount} 件商品 · 到店自取` }}</text>
      <view v-if="showShop" class="order-actions">
        <IconButton
          v-if="showCancel && order.status === 'CREATED'"
          name="close"
          label="取消订单"
          variant="danger"
          :loading="cancelling"
          @click="emit('cancel')"
        />
        <IconButton v-if="clickable" name="arrow-right" label="查看订单详情" variant="secondary" @click="emit('open')" />
      </view>
      <slot v-else name="action" />
    </view>
  </view>
</template>

<style scoped>
.order { margin-bottom: 16px; padding: 19px; border: 1px solid var(--color-border); border-radius: 18px; background: #fffdfa; }
.order.clickable:active { opacity: 0.82; }
.order.compact { padding: 18px; }
.order-top, .order-meta, .order-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.shop-identity { display: flex; min-width: 0; flex: 1; align-items: center; gap: 12px; }
.shop-symbol { display: flex; width: 46px; height: 46px; flex: none; align-items: center; justify-content: center; border-radius: 12px; background: #f9eadb; }
.order-heading { min-width: 0; flex: 1; }
.shop-name { overflow-wrap: anywhere; font-size: 16px; font-weight: 700; line-height: 1.4; }
.order-number { color: #93887f; font-size: 11px; line-height: 1.5; }
.order-heading .order-number { margin-top: 4px; }
.compact-number { color: #423830; font-size: 14px; font-weight: 700; }
.items { margin: 17px 0 14px; color: #6f6258; font-size: 13px; line-height: 1.65; overflow-wrap: anywhere; }
.order-time { color: #9a8b80; font-size: 11px; }
.total { flex: none; color: #332b26; font-size: 19px; font-weight: 750; }
.order-actions { display: flex; align-items: center; gap: 8px; }
.compact .items { margin: 12px 0; }
.compact .total { font-size: 17px; }
</style>
