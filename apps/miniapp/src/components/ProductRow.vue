<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import FoodImage from "./FoodImage.vue";
import IconButton from "./IconButton.vue";
import QuantityStepper from "./QuantityStepper.vue";
import { formatMoney } from "../utils/format";
import type { Product } from "../types";
withDefaults(defineProps<{ product: Product; quantity?: number; disabled?: boolean }>(), { quantity: 0, disabled: false });
defineEmits<{ change: [value: number] }>();
</script>

<template>
  <view :class="['product-row', { sold: product.stock < 1 }]">
    <view class="product-top">
      <FoodImage :src="product.image" :size="72" />
      <view class="product-info">
        <text class="name">{{ product.name }}</text>
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
.product-row { padding: 17px 0; border-bottom: 1px solid var(--color-border); }
.product-top { display: flex; align-items: flex-start; gap: 10px; }
.product-info { min-width: 0; flex: 1; }
.name { display: block; color: var(--color-text); font-size: 14px; font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.description { display: -webkit-box; overflow: hidden; margin-top: 5px; color: var(--color-text-secondary); font-size: 11px; line-height: 1.5; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.stock { display: block; margin-top: 5px; color: var(--color-text-secondary); font-size: 10px; }
.product-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
.price { min-width: 0; color: var(--color-accent); font-size: 17px; font-weight: 750; overflow-wrap: anywhere; }
.sold .product-top { opacity: 0.5; }
</style>
