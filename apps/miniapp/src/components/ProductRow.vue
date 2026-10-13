<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import FoodImage from "./FoodImage.vue";
import IconButton from "./IconButton.vue";
import QuantityStepper from "./QuantityStepper.vue";
import { formatMoney } from "../utils/format";
import type { Product } from "../types";
withDefaults(defineProps<{ product: Product; quantity?: number; disabled?: boolean; signature?: boolean }>(), { quantity: 0, disabled: false, signature: false });
defineEmits<{ change: [value: number] }>();
</script>

<template>
  <view :class="['product-row', { sold: product.stock < 1 }]">
    <view class="product-top">
      <FoodImage :src="product.image" :size="64" />
      <view class="product-info">
        <view class="name-row"><text v-if="signature" class="signature">招牌</text><text class="name">{{ product.name }}</text></view>
        <text v-if="product.description" class="description">{{ product.description }}</text>
        <text class="stock">{{ product.stock > 0 ? `剩余 ${product.stock} 份` : '已售罄' }}</text>
      </view>
    </view>
    <view class="product-bottom">
      <text class="price">{{ formatMoney(product.price) }}</text>
      <QuantityStepper v-if="quantity > 0" :value="quantity" :max="Math.min(product.stock, 99)" :disabled="disabled" @change="$emit('change', $event)" />
      <IconButton v-else name="add" variant="primary" compact :label="`加购${product.name}`" :disabled="disabled || product.stock < 1" @click="$emit('change', 1)" />
    </view>
  </view>
</template>

<style scoped>
.product-row { padding: 34rpx 0; border-bottom: 2rpx solid var(--color-border); }
.product-top { display: flex; align-items: flex-start; gap: 20rpx; }
.product-info { min-width: 0; flex: 1; }
.name { display: block; color: var(--color-text); font-size: var(--font-body); font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.description { display: -webkit-box; overflow: hidden; margin-top: 10rpx; color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.5; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.stock { display: block; margin-top: 10rpx; color: var(--color-text-secondary); font-size: var(--font-caption); }
.product-bottom { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 24rpx; }
.price { min-width: 0; color: var(--color-brand); font-size: var(--font-body); font-weight: 750; overflow-wrap: anywhere; }
.sold .product-top { opacity: 0.5; }
.name-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1); }
.signature { padding: 2rpx var(--space-1); border-radius: var(--radius-control); background: var(--color-brand-soft); color: var(--color-brand); font-size: var(--font-caption); font-weight: 600; }
</style>
