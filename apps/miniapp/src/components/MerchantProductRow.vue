<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
import FoodImage from "./FoodImage.vue";
import { iconColors } from "../icons";
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
      <view class="product-state"><van-switch :checked="product.isAvailable" :loading="busy" :disabled="disabled || busy" size="23px" :active-color="iconColors.brand" inactive-color="#dbe1ee" @change="$emit('available', Boolean(nativeDetail($event)))" /><text>{{ product.isAvailable ? '在售' : '下架' }}</text></view>
    </view>
    <view class="product-controls">
      <view class="stock"><text class="stock-label">库存</text><IconButton name="minus" label="减少库存" variant="secondary" compact :disabled="disabled || busy || product.stock <= 0" @click="$emit('stock', -1)" /><text :key="product.stock" class="stock-value motion-count">{{ product.stock }}</text><IconButton name="add" label="增加库存" variant="secondary" compact :disabled="disabled || busy || product.stock >= 1000000" @click="$emit('stock', 1)" /></view>
      <IconButton name="edit" label="编辑商品" compact :disabled="disabled || busy" @click="$emit('edit')" />
    </view>
  </view>
</template>

<style scoped>
.merchant-product { padding: 21px 0; border-bottom: 1px solid var(--color-border); }
.product-content, .product-controls, .stock { display: flex; align-items: center; gap: 12px; }
.product-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.product-name { color: var(--color-text); font-size: 14px; font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.category { color: var(--color-text-secondary); font-size: 10px; overflow-wrap: anywhere; }
.price { color: var(--color-accent); font-size: 16px; font-weight: 750; overflow-wrap: anywhere; }
.product-state { display: flex; flex: none; flex-direction: column; align-items: center; gap: 9px; color: var(--color-text-secondary); font-size: 10px; }
.product-controls { justify-content: space-between; margin-top: 16px; }
.stock { min-width: 0; gap: 7px; }
.stock-label { margin-right: 5px; color: var(--color-text-secondary); font-size: 10px; }
.stock-value { min-width: 30px; color: var(--color-text); font-size: 12px; font-weight: 650; text-align: center; font-variant-numeric: tabular-nums; }
</style>
