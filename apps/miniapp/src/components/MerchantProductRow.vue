<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
import FoodImage from "./FoodImage.vue";
import { nativeDetail } from "../utils/events";
import { formatMoney } from "../utils/format";
import type { Product } from "../types";
withDefaults(defineProps<{ product: Product; category?: string; busy?: boolean; disabled?: boolean }>(), { category: "未分类", busy: false, disabled: false });
defineEmits<{ edit: []; stock: [delta: number]; available: [value: boolean] }>();
</script>

<template>
  <view class="merchant-product">
    <view class="product-content">
      <FoodImage :src="product.image" :size="72" />
      <view class="product-main"><text class="product-name">{{ product.name }}</text><text class="category">{{ category }}</text><text class="price">{{ formatMoney(product.price) }}</text></view>
      <view class="product-state"><van-switch :checked="product.isAvailable" :loading="busy" :disabled="disabled || busy" size="46rpx" active-color="var(--color-brand)" inactive-color="var(--color-border)" @change="$emit('available', Boolean(nativeDetail($event)))" /><text>{{ product.isAvailable ? '在售' : '下架' }}</text></view>
    </view>
    <view class="product-controls">
      <view class="stock"><text class="stock-label">库存</text><IconButton name="minus" label="减少库存" variant="secondary" compact :disabled="disabled || busy || product.stock <= 0" @click="$emit('stock', -1)" /><text :key="product.stock" class="stock-value motion-count">{{ product.stock }}</text><IconButton name="add" label="增加库存" variant="secondary" compact :disabled="disabled || busy || product.stock >= 1000000" @click="$emit('stock', 1)" /></view>
      <IconButton name="edit" label="编辑商品" compact :disabled="disabled || busy" @click="$emit('edit')" />
    </view>
  </view>
</template>

<style scoped>
.merchant-product { padding: var(--space-4) 0; border-bottom: 2rpx solid var(--color-border); }
.product-content, .product-controls, .stock { display: flex; align-items: center; gap: 24rpx; }
.product-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 10rpx; }
.product-name { color: var(--color-text); font-size: var(--font-body); font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.category { color: var(--color-text-secondary); font-size: var(--font-caption); overflow-wrap: anywhere; }
.price { color: var(--color-brand); font-size: var(--font-body); font-weight: 750; overflow-wrap: anywhere; }
.product-state { display: flex; flex: none; flex-direction: column; align-items: center; gap: 18rpx; color: var(--color-text-secondary); font-size: var(--font-caption); }
.product-controls { justify-content: space-between; margin-top: 32rpx; }
.stock { min-width: 0; gap: 14rpx; }
.stock-label { margin-right: 10rpx; color: var(--color-text-secondary); font-size: var(--font-caption); }
.stock-value { min-width: 60rpx; color: var(--color-text); font-size: var(--font-caption); font-weight: 650; text-align: center; font-variant-numeric: tabular-nums; }
</style>
