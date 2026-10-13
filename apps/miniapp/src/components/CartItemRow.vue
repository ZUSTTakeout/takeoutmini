<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import FoodImage from "./FoodImage.vue";
import QuantityStepper from "./QuantityStepper.vue";
import { formatMoney } from "../utils/format";
import type { CartItem } from "../types";
withDefaults(defineProps<{ item: CartItem; image?: string | null; readonly?: boolean; disabled?: boolean }>(), { image: "", readonly: false, disabled: false });
defineEmits<{ change: [value: number] }>();
</script>

<template>
  <view :class="['cart-item', { readonly }]">
    <FoodImage :src="image" :size="readonly ? 44 : 76" />
    <view class="item-main">
      <text class="item-name">{{ item.name }}</text>
      <view class="item-bottom">
        <text class="item-price">{{ formatMoney(item.price * item.quantity) }}</text>
        <QuantityStepper v-if="!readonly" :value="item.quantity" :max="Math.min(item.stock, 99)" :disabled="disabled" @change="$emit('change', $event)" />
        <text v-else class="item-count">× {{ item.quantity }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.cart-item { display: flex; align-items: center; gap: 28rpx; padding: 38rpx 0; border-bottom: 2rpx solid var(--color-border); }
.cart-item:last-child { border-bottom: 0; }
.item-main { min-width: 0; flex: 1; }
.item-name { display: block; color: var(--color-text); font-size: var(--font-body); font-weight: 650; line-height: 1.5; overflow-wrap: anywhere; }
.item-bottom { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 20rpx; }
.item-price { color: var(--color-brand); font-size: var(--font-body); font-weight: 700; overflow-wrap: anywhere; }
.item-count { color: var(--color-text-secondary); font-size: var(--font-caption); }
.readonly { padding: 28rpx 0; }
.readonly .item-name { font-size: var(--font-body); }
.readonly .item-price { color: var(--color-text); font-size: var(--font-body); }
</style>
