<script setup lang="ts">
import FoodImage from "./FoodImage.vue";
import IconButton from "./IconButton.vue";
import QuantityStepper from "./QuantityStepper.vue";
import { formatMoney } from "../utils/format";
import type { Product } from "../types";

withDefaults(defineProps<{ product: Product; quantity?: number; disabled?: boolean }>(), {
  quantity: 0, disabled: false,
});
defineEmits<{ change: [value: number] }>();
</script>

<template>
  <view class="product-row">
    <view class="product-top">
      <FoodImage :src="product.image" :size="64" />
      <view class="product-info">
        <text class="name">{{ product.name }}</text>
        <text v-if="product.description" class="description">{{ product.description }}</text>
        <text class="stock">{{ product.stock > 0 ? `剩余 ${product.stock} 份` : '已售罄' }}</text>
      </view>
    </view>
    <view class="product-bottom">
      <text class="price">{{ formatMoney(product.price) }}</text>
      <QuantityStepper
        v-if="quantity > 0"
        :value="quantity"
        :max="Math.min(product.stock, 99)"
        :disabled="disabled"
        @change="$emit('change', $event)"
      />
      <IconButton v-else name="add" variant="primary" label="加入购物车" :disabled="disabled || product.stock < 1" @click="$emit('change', 1)" />
    </view>
  </view>
</template>

<style scoped>
.product-row { padding: 16px 0; border-bottom: 1px solid var(--color-border); }
.product-top { display: flex; align-items: flex-start; gap: 12px; }
.product-info { min-width: 0; flex: 1; }
.name { display: block; overflow-wrap: anywhere; font-size: 15px; font-weight: 700; line-height: 1.45; }
.description { display: -webkit-box; overflow: hidden; margin-top: 5px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.4; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.stock { display: block; margin-top: 6px; color: var(--color-text-secondary); font-size: 11px; }
.product-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.price { min-width: 0; overflow-wrap: anywhere; color: var(--color-brand); font-size: 16px; font-weight: 750; }
</style>
